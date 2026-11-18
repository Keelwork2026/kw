-- Phase 1: core platform — tenancy, roles, invitations, audit log.
--
-- Rules followed by every Keelwork migration:
--   * RLS is enabled on every table; anon can write nothing.
--   * Clients read through policies that call is_org_member / has_permission.
--   * Sensitive writes go through SECURITY DEFINER RPCs that pin
--     search_path = '', check a permission and write an audit row.
--   * Internal helpers start with "_" and are not callable by clients.
--   * keelwork.finish_migration() re-checks all of the above and refuses to
--     record the migration if anything slipped.

-- ---------------------------------------------------------------------
-- Platform schema (agents may never touch it; see the policy engine)
-- ---------------------------------------------------------------------
create schema if not exists keelwork;
revoke all on schema keelwork from public;

create table keelwork.applied_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create or replace function keelwork.finish_migration(p_version text) returns void
language plpgsql set search_path = '' as $$
declare r record;
begin
  -- Every public table has RLS.
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    raise exception 'migration %: table public.% has no RLS', p_version, r.relname;
  end loop;

  -- anon can write nothing.
  for r in
    select table_name, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  loop
    raise exception 'migration %: anon has % on public.%', p_version, r.privilege_type, r.table_name;
  end loop;

  -- Clients never get TRUNCATE, REFERENCES or TRIGGER.
  for r in
    select table_name, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  loop
    raise exception 'migration %: authenticated has % on public.%', p_version, r.privilege_type, r.table_name;
  end loop;

  -- Every SECURITY DEFINER function pins search_path = ''.
  for r in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)
  loop
    raise exception 'migration %: % is SECURITY DEFINER without search_path = ''''', p_version, r.sig;
  end loop;

  -- Nothing in public is executable by PUBLIC or anon; "_" helpers are
  -- not executable by authenticated either.
  for r in
    select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    if left(r.proname, 1) = '_' then
      execute format('revoke all on function %s from authenticated', r.sig);
    end if;
  end loop;

  insert into keelwork.applied_migrations(version) values (p_version)
  on conflict (version) do nothing;
end $$;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.org_role as enum ('owner', 'admin', 'member', 'billing', 'viewer');
create type public.member_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  personal boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members(user_id);

create table public.role_permissions (
  role public.org_role not null,
  permission text not null,
  primary key (role, permission)
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.org_role not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_org_idx on public.invitations(org_id);

create table public.audit_events (
  id bigserial primary key,
  org_id uuid references public.organizations(id) on delete set null,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_org_idx on public.audit_events(org_id, created_at desc);
create index audit_events_actor_idx on public.audit_events(actor_id, created_at desc);

-- ---------------------------------------------------------------------
-- Seed permissions
-- ---------------------------------------------------------------------
insert into public.role_permissions(role, permission) values
  ('owner','org.read'),('admin','org.read'),('member','org.read'),('billing','org.read'),('viewer','org.read'),
  ('owner','org.manage'),('admin','org.manage'),
  ('owner','members.invite'),('admin','members.invite'),
  ('owner','members.manage'),('admin','members.manage'),
  ('owner','workspace.manage'),('admin','workspace.manage'),('member','workspace.manage'),
  ('owner','audit.read'),('admin','audit.read'),
  ('owner','billing.manage'),('billing','billing.manage'),
  ('owner','usage.read'),('admin','usage.read'),('billing','usage.read'),
  ('owner','project.read'),('admin','project.read'),('member','project.read'),('viewer','project.read'),
  ('owner','project.write'),('admin','project.write'),('member','project.write'),
  ('owner','project.manage'),('admin','project.manage'),
  ('owner','secret.manage'),('admin','secret.manage');

-- ---------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------
create or replace function public._audit(
  p_org uuid, p_action text, p_target_type text, p_target_id text,
  p_metadata jsonb default '{}'::jsonb, p_actor uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(org_id, actor_id, action, target_type, target_id, metadata)
  values (p_org, coalesce(p_actor, auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
end $$;

create or replace function public._audit_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end $$;

create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute function public._audit_immutable();
create trigger audit_events_no_truncate before truncate on public.audit_events
  for each statement execute function public._audit_immutable();

create or replace function public._slugify(p text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(left(trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g')), 48), ''), 'org')
$$;

create or replace function public._unique_slug(p text) returns text
language plpgsql security definer set search_path = '' as $$
declare base text := public._slugify(p); candidate text := base; n int := 1;
begin
  while exists (select 1 from public.organizations where slug = candidate) loop
    n := n + 1;
    candidate := left(base, 44) || '-' || n;
    if n > 50 then
      candidate := left(base, 40) || '-' || substr(md5(random()::text), 1, 6);
    end if;
  end loop;
  return candidate;
end $$;

create or replace function public._active_owner_count(p_org uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.org_members
  where org_id = p_org and role = 'owner' and status = 'active'
$$;

create or replace function public._require(p_org uuid, p_perm text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  if not public.has_permission(p_org, p_perm) then
    raise exception 'permission denied: %', p_perm using errcode = 'insufficient_privilege';
  end if;
end $$;

create or replace function public._caller_role(p_org uuid) returns public.org_role
language sql stable security definer set search_path = '' as $$
  select role from public.org_members
  where org_id = p_org and user_id = auth.uid() and status = 'active'
$$;

-- ---------------------------------------------------------------------
-- Public helpers used by RLS policies
-- ---------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = auth.uid() and status = 'active'
  )
$$;

create or replace function public.has_permission(p_org uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members m
    join public.role_permissions rp on rp.role = m.role
    where m.org_id = p_org and m.user_id = auth.uid()
      and m.status = 'active' and rp.permission = p_perm
  )
$$;

-- ---------------------------------------------------------------------
-- New users: profile + personal organization
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_name text := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'you'), '@', 1));
begin
  insert into public.profiles(id, email, display_name)
  values (new.id, new.email, left(v_name, 80));

  insert into public.organizations(name, slug, personal, created_by)
  values (left(v_name || '''s workspace', 80), public._unique_slug(v_name), true, new.id)
  returning id into v_org;

  insert into public.org_members(org_id, user_id, role) values (v_org, new.id, 'owner');
  insert into public.workspaces(org_id, name) values (v_org, 'Default');
  perform public._audit(v_org, 'org.created', 'organization', v_org::text, jsonb_build_object('personal', true), new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------
create or replace function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = 'insufficient_privilege'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'organization name must be 1-80 characters';
  end if;
  insert into public.organizations(name, slug, created_by)
  values (trim(p_name), public._unique_slug(p_name), v_uid) returning id into v_org;
  insert into public.org_members(org_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.workspaces(org_id, name) values (v_org, 'Default');
  perform public._audit(v_org, 'org.created', 'organization', v_org::text, '{}'::jsonb);
  return v_org;
end $$;

-- Returns the raw token once. Only its sha256 is stored.
create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.org_role)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_id uuid; v_email text := lower(trim(p_email));
begin
  perform public._require(p_org, 'members.invite');
  if p_role = 'owner' and public._caller_role(p_org) <> 'owner' then
    raise exception 'only owners can invite owners' using errcode = 'insufficient_privilege';
  end if;
  if exists (
    select 1 from public.org_members m join auth.users u on u.id = m.user_id
    where m.org_id = p_org and lower(u.email) = v_email
  ) then
    raise exception 'that person is already a member';
  end if;
  -- An older open invitation for the same address is revoked.
  update public.invitations set revoked_at = now()
  where org_id = p_org and lower(email) = v_email and accepted_at is null and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.invitations(org_id, email, role, token_hash, invited_by, expires_at)
  values (p_org, v_email, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid(), now() + interval '7 days')
  returning id into v_id;
  perform public._audit(p_org, 'invitation.created', 'invitation', v_id::text,
    jsonb_build_object('email', v_email, 'role', p_role));
  return v_token;
end $$;

create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; v_uid uuid := auth.uid(); v_email text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = 'insufficient_privilege'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'invitation is invalid'; end if;

  select * into inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at <= now() then
    raise exception 'invitation is invalid';
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from lower(inv.email) then
    raise exception 'invitation is for a different email address' using errcode = 'insufficient_privilege';
  end if;

  insert into public.org_members(org_id, user_id, role) values (inv.org_id, v_uid, inv.role)
  on conflict (org_id, user_id) do nothing;
  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = inv.id;
  perform public._audit(inv.org_id, 'invitation.accepted', 'invitation', inv.id::text,
    jsonb_build_object('role', inv.role));
  return inv.org_id;
end $$;

create or replace function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations where id = p_invitation for update;
  if not found then raise exception 'invitation not found'; end if;
  perform public._require(inv.org_id, 'members.invite');
  if inv.accepted_at is not null then raise exception 'invitation was already accepted'; end if;
  update public.invitations set revoked_at = coalesce(revoked_at, now()) where id = inv.id;
  perform public._audit(inv.org_id, 'invitation.revoked', 'invitation', inv.id::text, '{}'::jsonb);
end $$;

create or replace function public.update_member_role(p_org uuid, p_user uuid, p_role public.org_role)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_current public.org_role; v_caller public.org_role;
begin
  perform public._require(p_org, 'members.manage');
  v_caller := public._caller_role(p_org);
  select role into v_current from public.org_members where org_id = p_org and user_id = p_user for update;
  if not found then raise exception 'member not found'; end if;
  if (v_current = 'owner' or p_role = 'owner') and v_caller <> 'owner' then
    raise exception 'only owners can change owner roles' using errcode = 'insufficient_privilege';
  end if;
  if v_current = 'owner' and p_role <> 'owner'
     and public._active_owner_count(p_org) <= 1
     and exists (select 1 from public.org_members where org_id = p_org and user_id = p_user and status = 'active') then
    raise exception 'an organization must keep at least one owner';
  end if;
  update public.org_members set role = p_role where org_id = p_org and user_id = p_user;
  perform public._audit(p_org, 'member.role_changed', 'user', p_user::text,
    jsonb_build_object('from', v_current, 'to', p_role));
end $$;

create or replace function public.set_member_status(p_org uuid, p_user uuid, p_status public.member_status)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_role public.org_role; v_status public.member_status;
begin
  perform public._require(p_org, 'members.manage');
  if p_user = auth.uid() then raise exception 'you cannot change your own status'; end if;
  select role, status into v_role, v_status from public.org_members where org_id = p_org and user_id = p_user for update;
  if not found then raise exception 'member not found'; end if;
  if v_role = 'owner' and public._caller_role(p_org) <> 'owner' then
    raise exception 'only owners can change an owner''s status' using errcode = 'insufficient_privilege';
  end if;
  if p_status = 'suspended' and v_role = 'owner' and v_status = 'active' and public._active_owner_count(p_org) <= 1 then
    raise exception 'an organization must keep at least one owner';
  end if;
  update public.org_members set status = p_status where org_id = p_org and user_id = p_user;
  perform public._audit(p_org, 'member.status_changed', 'user', p_user::text,
    jsonb_build_object('from', v_status, 'to', p_status));
end $$;

create or replace function public.remove_member(p_org uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_role public.org_role; v_status public.member_status;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = 'insufficient_privilege'; end if;
  if p_user <> auth.uid() then
    perform public._require(p_org, 'members.manage');
  elsif not public.is_org_member(p_org) then
    raise exception 'permission denied: members.manage' using errcode = 'insufficient_privilege';
  end if;
  select role, status into v_role, v_status from public.org_members where org_id = p_org and user_id = p_user for update;
  if not found then raise exception 'member not found'; end if;
  if v_role = 'owner' and p_user <> auth.uid() and public._caller_role(p_org) <> 'owner' then
    raise exception 'only owners can remove an owner' using errcode = 'insufficient_privilege';
  end if;
  if v_role = 'owner' and v_status = 'active' and public._active_owner_count(p_org) <= 1 then
    raise exception 'an organization must keep at least one owner';
  end if;
  delete from public.org_members where org_id = p_org and user_id = p_user;
  perform public._audit(p_org, 'member.removed', 'user', p_user::text, jsonb_build_object('role', v_role));
end $$;

create or replace function public.record_security_event(p_action text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = 'insufficient_privilege'; end if;
  if p_action not in ('auth.signed_in', 'auth.password_changed', 'auth.mfa_enrolled',
                      'auth.mfa_removed', 'auth.mfa_verified', 'auth.signed_out_others') then
    raise exception 'unknown security event';
  end if;
  if pg_column_size(p_metadata) > 2048 then raise exception 'metadata too large'; end if;
  perform public._audit(null, p_action, 'user', auth.uid()::text, coalesce(p_metadata, '{}'::jsonb));
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.role_permissions enable row level security;
alter table public.workspaces enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.org_members a join public.org_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and a.status = 'active' and b.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select on public.organizations for select to authenticated
  using (public.has_permission(id, 'org.read'));

create policy org_members_select on public.org_members for select to authenticated
  using (public.has_permission(org_id, 'org.read'));

create policy role_permissions_select on public.role_permissions for select to authenticated using (true);

create policy workspaces_select on public.workspaces for select to authenticated
  using (public.has_permission(org_id, 'org.read'));
create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (public.has_permission(org_id, 'workspace.manage'));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_permission(org_id, 'workspace.manage'))
  with check (public.has_permission(org_id, 'workspace.manage'));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (public.has_permission(org_id, 'workspace.manage'));

create policy invitations_select on public.invitations for select to authenticated
  using (public.has_permission(org_id, 'members.invite'));

create policy audit_select on public.audit_events for select to authenticated using (
  (org_id is not null and public.has_permission(org_id, 'audit.read'))
  or (org_id is null and actor_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- Grants (Supabase grants everything by default; take it back)
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.organizations, public.org_members, public.role_permissions,
  public.workspaces, public.invitations, public.audit_events from anon, authenticated;
revoke all on sequence public.audit_events_id_seq from anon, authenticated;

grant select on public.profiles, public.organizations, public.org_members,
  public.role_permissions, public.workspaces, public.audit_events to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
grant insert, update, delete on public.workspaces to authenticated;
-- token_hash is never selectable by clients.
grant select (id, org_id, email, role, invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at)
  on public.invitations to authenticated;

select keelwork.finish_migration('20261107000100_phase1_core');
