-- Phase 6: secrets vault metadata and the project migration ledger.
-- Ciphertext is stored here but never granted to clients; master keys
-- never enter the database.

create table public.project_secrets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (name ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  environment text not null check (environment in ('development', 'preview', 'production')),
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  wrapped_key text not null,
  key_version integer not null check (key_version >= 1),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name, environment)
);

create trigger project_secrets_org before insert or update of project_id on public.project_secrets
  for each row execute function public._inherit_org_from_project();
create trigger project_secrets_touch before update on public.project_secrets
  for each row execute function public._touch_updated_at();

create table public.project_migrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  filename text not null check (filename ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,150}\.sql$'),
  checksum text not null check (checksum ~ '^[0-9a-f]{64}$'),
  risk text not null check (risk in ('additive', 'destructive')),
  status text not null default 'pending' check (status in ('pending', 'applied', 'failed')),
  confirmed boolean not null default false,
  requested_by uuid not null references auth.users(id),
  error text,
  attempt_started_at timestamptz not null default now(),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index project_migrations_applied_once on public.project_migrations(project_id, filename) where status = 'applied';
create unique index project_migrations_one_pending on public.project_migrations(project_id, filename) where status = 'pending';

create trigger project_migrations_org before insert on public.project_migrations
  for each row execute function public._inherit_org_from_project();

create or replace function public._project_migrations_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'the migration ledger is append-only' using errcode = 'insufficient_privilege'; end if;
  if old.status <> 'pending' then raise exception 'finished migration attempts are immutable' using errcode = 'insufficient_privilege'; end if;
  if new.checksum <> old.checksum or new.filename <> old.filename or new.project_id <> old.project_id then
    raise exception 'a migration attempt cannot change what it applies';
  end if;
  return new;
end $$;
create trigger project_migrations_guard before update or delete on public.project_migrations
  for each row execute function public._project_migrations_guard();

-- ---------------------------------------------------------------------
create or replace function public.set_project_secret(p_project uuid, p_name text, p_environment text, p_envelope jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'secret.manage');
  if p_name !~ '^[A-Z][A-Z0-9_]{1,63}$' then raise exception 'secret names look like STRIPE_SECRET_KEY'; end if;
  if p_environment not in ('development', 'preview', 'production') then raise exception 'unknown environment'; end if;
  if coalesce(jsonb_typeof(p_envelope -> 'ciphertext'), '') <> 'string' or coalesce(jsonb_typeof(p_envelope -> 'iv'), '') <> 'string'
     or coalesce(jsonb_typeof(p_envelope -> 'auth_tag'), '') <> 'string' or coalesce(jsonb_typeof(p_envelope -> 'wrapped_key'), '') <> 'string'
     or coalesce(jsonb_typeof(p_envelope -> 'key_version'), '') <> 'number' then
    raise exception 'secrets must be encrypted by the server before they are stored';
  end if;
  insert into public.project_secrets(project_id, org_id, name, environment, ciphertext, iv, auth_tag, wrapped_key, key_version, updated_by)
  values (p_project, v_org, p_name, p_environment, p_envelope ->> 'ciphertext', p_envelope ->> 'iv', p_envelope ->> 'auth_tag',
          p_envelope ->> 'wrapped_key', (p_envelope ->> 'key_version')::int, auth.uid())
  on conflict (project_id, name, environment) do update set
    ciphertext = excluded.ciphertext, iv = excluded.iv, auth_tag = excluded.auth_tag,
    wrapped_key = excluded.wrapped_key, key_version = excluded.key_version, updated_by = excluded.updated_by;
  -- Audit by name only; values never leave the server.
  perform public._audit(v_org, 'secret.set', 'project', p_project::text, jsonb_build_object('name', p_name, 'environment', p_environment));
end $$;

create or replace function public.delete_project_secret(p_project uuid, p_name text, p_environment text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'secret.manage');
  delete from public.project_secrets where project_id = p_project and name = p_name and environment = p_environment;
  if not found then raise exception 'secret not found'; end if;
  perform public._audit(v_org, 'secret.deleted', 'project', p_project::text, jsonb_build_object('name', p_name, 'environment', p_environment));
end $$;

create or replace function public.request_migration_apply(p_project uuid, p_filename text, p_checksum text, p_risk text, p_confirmation text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; prev public.project_migrations; v_id uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.manage');
  if p_risk not in ('additive', 'destructive') then raise exception 'denied migrations cannot be applied'; end if;

  select * into prev from public.project_migrations where project_id = p_project and filename = p_filename and status = 'applied';
  if found then
    if prev.checksum <> p_checksum then
      raise exception 'drift: % changed after it was applied; write a new migration instead', p_filename;
    end if;
    raise exception '% was already applied', p_filename;
  end if;
  if p_risk = 'destructive' and p_confirmation is distinct from p_filename then
    raise exception 'destructive migration: type the file name to confirm';
  end if;

  select * into prev from public.project_migrations where project_id = p_project and filename = p_filename and status = 'pending' for update;
  if found then
    if prev.attempt_started_at > now() - interval '15 minutes' then
      raise exception '% is already being applied', p_filename;
    end if;
    update public.project_migrations set status = 'failed', error = 'stale attempt released' where id = prev.id;
  end if;

  insert into public.project_migrations(project_id, org_id, filename, checksum, risk, confirmed, requested_by)
  values (p_project, v_org, p_filename, p_checksum, p_risk, p_risk = 'destructive', auth.uid()) returning id into v_id;
  perform public._audit(v_org, 'migration.apply_requested', 'project', p_project::text,
    jsonb_build_object('file', p_filename, 'risk', p_risk, 'checksum', p_checksum));
  return v_id;
end $$;

create or replace function public.complete_migration_apply(p_attempt uuid, p_ok boolean, p_error text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare m public.project_migrations;
begin
  select * into m from public.project_migrations where id = p_attempt for update;
  if not found then raise exception 'attempt not found'; end if;
  if m.requested_by <> auth.uid() then raise exception 'only the requester can record the outcome' using errcode = 'insufficient_privilege'; end if;
  update public.project_migrations set status = case when p_ok then 'applied' else 'failed' end,
    applied_at = case when p_ok then now() end, error = case when p_ok then null else left(coalesce(p_error, 'failed'), 1000) end
  where id = m.id;
  perform public._audit(m.org_id, case when p_ok then 'migration.applied' else 'migration.failed' end, 'project', m.project_id::text,
    jsonb_build_object('file', m.filename, 'checksum', m.checksum));
end $$;

alter table public.project_secrets enable row level security;
alter table public.project_migrations enable row level security;
-- Secret metadata is for active members only (support grants don't see it).
create policy project_secrets_select on public.project_secrets for select to authenticated using (public.is_org_member(org_id));
create policy project_migrations_select on public.project_migrations for select to authenticated using (public.has_permission(org_id, 'project.read'));

revoke all on public.project_secrets, public.project_migrations from anon, authenticated;
grant select (id, project_id, org_id, name, environment, key_version, updated_by, created_at, updated_at) on public.project_secrets to authenticated;
grant select on public.project_migrations to authenticated;

select keelwork.finish_migration('20261107000600_phase6_data');
