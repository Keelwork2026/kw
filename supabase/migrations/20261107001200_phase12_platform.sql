-- Phase 12: platform admins with owner-approved, time-boxed, read-only
-- support access; the template marketplace; privacy-safe analytics.

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('support', 'security', 'reviewer', 'superadmin')),
  created_at timestamptz not null default now()
);
-- Added by hand in SQL by someone with database access. No self-service path.

create table public.platform_audit_events (
  id bigserial primary key,
  admin_id uuid,
  action text not null,
  org_id uuid,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create trigger platform_audit_immutable before update or delete on public.platform_audit_events for each row execute function public._audit_immutable();
create trigger platform_audit_no_truncate before truncate on public.platform_audit_events for each statement execute function public._audit_immutable();

create table public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 1000),
  requested_hours integer not null check (requested_hours between 1 and 72),
  status text not null default 'requested' check (status in ('requested', 'approved', 'denied', 'revoked', 'expired')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or (starts_at is not null and expires_at is not null and expires_at <= starts_at + interval '72 hours'))
);
create index support_grants_org_idx on public.support_access_grants(org_id, status);

create or replace function public.is_platform_admin(p_roles text[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid() and (p_roles is null or role = any(p_roles)))
$$;

create or replace function public._platform_audit(p_action text, p_org uuid, p_target text, p_metadata jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.platform_audit_events(admin_id, action, org_id, target, metadata) values (auth.uid(), p_action, p_org, p_target, coalesce(p_metadata, '{}'::jsonb));
end $$;

-- has_permission also honours an active, owner-approved support grant —
-- read-only (org.read, project.read) for its time window and nothing else.
create or replace function public.has_permission(p_org uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members m
    join public.role_permissions rp on rp.role = m.role
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active' and rp.permission = p_perm
  ) or (
    p_perm in ('org.read', 'project.read') and exists (
      select 1 from public.support_access_grants g
      join public.platform_admins a on a.user_id = g.requested_by
      where g.org_id = p_org and g.requested_by = auth.uid() and g.status = 'approved'
        and now() >= g.starts_at and now() < g.expires_at
    )
  )
$$;

create or replace function public.admin_list_orgs()
returns table (id uuid, name text, plan_key text, member_count bigint, project_count bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'permission denied: platform admin' using errcode = 'insufficient_privilege'; end if;
  perform public._platform_audit('admin.list_orgs', null, null, '{}'::jsonb);
  -- Metadata only: never code, secrets or data.
  return query
  select o.id, o.name, b.plan_key,
    (select count(*) from public.org_members m where m.org_id = o.id and m.status = 'active'),
    (select count(*) from public.projects p where p.org_id = o.id and p.status <> 'archived'),
    o.created_at
  from public.organizations o left join public.org_billing b on b.org_id = o.id
  order by o.created_at desc;
end $$;

create or replace function public.request_support_access(p_org uuid, p_reason text, p_hours integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_platform_admin(array['support', 'security', 'superadmin']) then raise exception 'permission denied: platform admin' using errcode = 'insufficient_privilege'; end if;
  if p_hours is null or p_hours not between 1 and 72 then raise exception 'access can be requested for 1-72 hours'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'explain why access is needed (at least 10 characters)'; end if;
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'organization not found'; end if;
  insert into public.support_access_grants(org_id, requested_by, reason, requested_hours) values (p_org, auth.uid(), trim(p_reason), p_hours) returning id into v_id;
  perform public._audit(p_org, 'support.access_requested', 'support_grant', v_id::text, jsonb_build_object('hours', p_hours, 'reason', left(trim(p_reason), 300)));
  perform public._platform_audit('support.access_requested', p_org, v_id::text, jsonb_build_object('hours', p_hours));
  return v_id;
end $$;

create or replace function public.decide_support_access(p_grant uuid, p_approve boolean, p_hours integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.support_access_grants; v_hours integer;
begin
  select * into g from public.support_access_grants where id = p_grant for update;
  if not found then raise exception 'request not found'; end if;
  if public._caller_role(g.org_id) is distinct from 'owner' then raise exception 'only an owner of the organization can decide support access' using errcode = 'insufficient_privilege'; end if;
  if g.status <> 'requested' then raise exception 'this request was already decided'; end if;
  v_hours := coalesce(p_hours, g.requested_hours);
  if v_hours not between 1 and 72 then raise exception 'access can be granted for 1-72 hours'; end if;
  if p_approve then
    update public.support_access_grants set status = 'approved', decided_by = auth.uid(), decided_at = now(), starts_at = now(), expires_at = now() + make_interval(hours => v_hours) where id = g.id;
  else
    update public.support_access_grants set status = 'denied', decided_by = auth.uid(), decided_at = now() where id = g.id;
  end if;
  perform public._audit(g.org_id, case when p_approve then 'support.access_approved' else 'support.access_denied' end, 'support_grant', g.id::text, jsonb_build_object('hours', v_hours));
  perform public._platform_audit(case when p_approve then 'support.access_approved' else 'support.access_denied' end, g.org_id, g.id::text, jsonb_build_object('hours', v_hours, 'decided_by', auth.uid()));
end $$;

create or replace function public.revoke_support_access(p_grant uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.support_access_grants;
begin
  select * into g from public.support_access_grants where id = p_grant for update;
  if not found then raise exception 'grant not found'; end if;
  if public._caller_role(g.org_id) is distinct from 'owner' and g.requested_by <> auth.uid() then
    raise exception 'only an owner or the requester can revoke access' using errcode = 'insufficient_privilege';
  end if;
  if g.status not in ('approved', 'requested') then raise exception 'this grant is not active'; end if;
  update public.support_access_grants set status = 'revoked', revoked_by = auth.uid(), revoked_at = now() where id = g.id;
  perform public._audit(g.org_id, 'support.access_revoked', 'support_grant', g.id::text, '{}'::jsonb);
  perform public._platform_audit('support.access_revoked', g.org_id, g.id::text, '{}'::jsonb);
end $$;

create or replace function public.expire_support_grants() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.support_access_grants set status = 'expired' where status = 'approved' and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------
create table public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  publisher_org uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null check (category in ('saas', 'commerce', 'internal-tool', 'portfolio', 'community', 'ai', 'other')),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'delisted')),
  rights_confirmed boolean not null check (rights_confirmed),
  blocking_findings integer not null default 0 check (blocking_findings >= 0),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger marketplace_items_touch before update on public.marketplace_items for each row execute function public._touch_updated_at();

create table public.marketplace_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  version integer not null check (version >= 1),
  manifest jsonb not null,
  files jsonb not null check (jsonb_typeof(files) = 'object' and pg_column_size(files) <= 8000000),
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (item_id, version)
);
create trigger marketplace_versions_immutable before update or delete on public.marketplace_versions for each row execute function public._audit_immutable();

alter table public.projects add column marketplace_version_id uuid references public.marketplace_versions(id) on delete set null;

create or replace function public.publish_marketplace_item(p_project uuid, p_title text, p_description text, p_category text, p_rights_confirmed boolean, p_files jsonb, p_manifest jsonb, p_findings jsonb, p_blocking integer)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_item uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.manage');
  if not coalesce(p_rights_confirmed, false) then raise exception 'confirm you hold the rights to everything in the template'; end if;
  if exists (select 1 from jsonb_object_keys(p_files) k where k ~ '(^|/)\.env' and k !~ '(^|/)\.env\.example$') then raise exception 'templates cannot contain env files'; end if;
  insert into public.marketplace_items(publisher_org, project_id, title, description, category, rights_confirmed, blocking_findings, created_by)
  values (v_org, p_project, trim(p_title), trim(p_description), p_category, true, greatest(0, coalesce(p_blocking, 0)), auth.uid()) returning id into v_item;
  insert into public.marketplace_versions(item_id, version, manifest, files, findings) values (v_item, 1, p_manifest, p_files, coalesce(p_findings, '[]'::jsonb));
  perform public._audit(v_org, 'marketplace.submitted', 'marketplace_item', v_item::text, jsonb_build_object('title', trim(p_title), 'blocking', p_blocking));
  return v_item;
end $$;

create or replace function public.review_marketplace_item(p_item uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.marketplace_items; v_new text;
begin
  if not public.is_platform_admin(array['reviewer', 'superadmin']) then raise exception 'permission denied: reviewer' using errcode = 'insufficient_privilege'; end if;
  select * into i from public.marketplace_items where id = p_item for update;
  if not found then raise exception 'item not found'; end if;
  if p_decision = 'approve' then
    if i.status <> 'pending_review' then raise exception 'only items waiting for review can be approved'; end if;
    if i.blocking_findings > 0 then raise exception 'items with blocking findings cannot be approved'; end if;
    v_new := 'approved';
  elsif p_decision = 'reject' then
    if i.status <> 'pending_review' then raise exception 'only items waiting for review can be rejected'; end if;
    v_new := 'rejected';
  elsif p_decision = 'delist' then
    if i.status <> 'approved' then raise exception 'only listed items can be delisted'; end if;
    v_new := 'delisted';
  else raise exception 'unknown decision'; end if;
  update public.marketplace_items set status = v_new, review_note = left(p_note, 1000), reviewed_by = auth.uid(), reviewed_at = now() where id = i.id;
  perform public._platform_audit('marketplace.' || v_new, i.publisher_org, i.id::text, jsonb_build_object('note', left(p_note, 300)));
  perform public._audit(i.publisher_org, 'marketplace.' || v_new, 'marketplace_item', i.id::text, jsonb_build_object('note', left(p_note, 300)));
end $$;

create or replace function public.install_template(p_item uuid, p_org uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.marketplace_items; v_version uuid; v_project uuid;
begin
  select * into i from public.marketplace_items where id = p_item;
  if not found or i.status <> 'approved' then raise exception 'this template is not available'; end if;
  select id into v_version from public.marketplace_versions where item_id = i.id order by version desc limit 1;
  v_project := public.create_project(p_org, coalesce(nullif(trim(p_name), ''), i.title), i.description, null, null);
  update public.projects set marketplace_version_id = v_version where id = v_project;
  perform public._audit(p_org, 'marketplace.installed', 'project', v_project::text, jsonb_build_object('item', i.id, 'version', v_version));
  return v_project;
end $$;

-- ---------------------------------------------------------------------
-- Analytics for customers' apps
-- ---------------------------------------------------------------------
create table public.analytics_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  site_key text not null unique check (site_key ~ '^[A-Za-z0-9_-]{24,64}$'),
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now()
);
create trigger analytics_sites_org before insert on public.analytics_sites for each row execute function public._inherit_org_from_project();

create table public.analytics_salts (
  day date primary key,
  salt bytea not null
);

create table public.analytics_events (
  id bigserial primary key,
  site_id uuid not null references public.analytics_sites(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  day date not null,
  path text not null check (char_length(path) <= 300),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 253),
  device text not null check (device in ('desktop', 'mobile', 'tablet', 'other')),
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{16}$'),
  created_at timestamptz not null default now()
);
create index analytics_events_site_day on public.analytics_events(site_id, day);

create or replace function public.enable_analytics(p_project uuid, p_origins text[]) returns text
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_key text; o text;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.manage');
  if p_origins is null or cardinality(p_origins) = 0 or cardinality(p_origins) > 10 then raise exception 'add 1-10 allowed origins'; end if;
  foreach o in array p_origins loop
    if o !~ '^https://[a-z0-9.-]+(:[0-9]{2,5})?$' and o !~ '^http://localhost(:[0-9]{2,5})?$' then raise exception 'origins look like https://shop.example.com'; end if;
  end loop;
  v_key := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.analytics_sites(project_id, org_id, site_key, allowed_origins) values (p_project, v_org, v_key, p_origins)
  on conflict (project_id) do update set allowed_origins = excluded.allowed_origins
  returning site_key into v_key;
  perform public._audit(v_org, 'analytics.enabled', 'project', p_project::text, jsonb_build_object('origins', p_origins));
  return v_key;
end $$;

-- Service only: today's salt (created on demand). Salts older than two days are deleted.
create or replace function public.analytics_salt_for(p_day date) returns bytea
language plpgsql security definer set search_path = '' as $$
declare v bytea;
begin
  delete from public.analytics_salts where day < p_day - 1;
  insert into public.analytics_salts(day, salt) values (p_day, extensions.gen_random_bytes(32)) on conflict (day) do nothing;
  select salt into v from public.analytics_salts where day = p_day;
  return v;
end $$;

create or replace function public.analytics_summary(p_project uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_org uuid; v_site uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.read');
  if p_to < p_from or p_to - p_from > 366 then raise exception 'choose a range of up to a year'; end if;
  select id into v_site from public.analytics_sites where project_id = p_project;
  return jsonb_build_object(
    'pageviews', (select count(*) from public.analytics_events where site_id = v_site and day between p_from and p_to),
    -- Visitors are counted per day: the daily salt makes hashes from different days unlinkable.
    'visitors', (select coalesce(sum(n), 0) from (select count(distinct visitor_hash) n from public.analytics_events where site_id = v_site and day between p_from and p_to group by day) d),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'pageviews', pv, 'visitors', v) order by day), '[]'::jsonb)
             from (select day, count(*) pv, count(distinct visitor_hash) v from public.analytics_events where site_id = v_site and day between p_from and p_to group by day) x));
end $$;

create or replace function public.analytics_breakdown(p_project uuid, p_dimension text, p_from date, p_to date, p_limit integer default 10)
returns table (key text, pageviews bigint, visitors bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_org uuid; v_site uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.read');
  if p_dimension not in ('path', 'referrer', 'device') then raise exception 'dimension must be path, referrer or device'; end if;
  select id into v_site from public.analytics_sites where project_id = p_project;
  return query
  select case p_dimension when 'path' then e.path when 'referrer' then coalesce(e.referrer_host, '(direct)') else e.device end as k,
         count(*)::bigint, count(distinct (e.day, e.visitor_hash))::bigint
  from public.analytics_events e where e.site_id = v_site and e.day between p_from and p_to
  group by 1 order by 2 desc limit greatest(1, least(p_limit, 50));
end $$;

alter table public.platform_admins enable row level security;
alter table public.platform_audit_events enable row level security;
alter table public.support_access_grants enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.marketplace_versions enable row level security;
alter table public.analytics_sites enable row level security;
alter table public.analytics_salts enable row level security;
alter table public.analytics_events enable row level security;

create policy platform_admins_self on public.platform_admins for select to authenticated using (user_id = auth.uid());
create policy platform_audit_select on public.platform_audit_events for select to authenticated using (public.is_platform_admin(array['security', 'superadmin']));
create policy support_grants_select on public.support_access_grants for select to authenticated
  using (requested_by = auth.uid() or (public.is_org_member(org_id) and public.has_permission(org_id, 'org.manage')));
create policy marketplace_items_select on public.marketplace_items for select to authenticated
  using (status = 'approved' or public.is_org_member(publisher_org) or public.is_platform_admin(array['reviewer', 'superadmin']));
create policy marketplace_versions_select on public.marketplace_versions for select to authenticated
  using (exists (select 1 from public.marketplace_items i where i.id = item_id and (i.status = 'approved' or public.is_org_member(i.publisher_org) or public.is_platform_admin(array['reviewer', 'superadmin']))));
create policy analytics_sites_select on public.analytics_sites for select to authenticated using (public.has_permission(org_id, 'project.read'));

revoke all on public.platform_admins, public.platform_audit_events, public.support_access_grants, public.marketplace_items,
  public.marketplace_versions, public.analytics_sites, public.analytics_salts, public.analytics_events from anon, authenticated;
revoke all on sequence public.platform_audit_events_id_seq, public.analytics_events_id_seq from anon, authenticated;
grant select on public.platform_admins, public.platform_audit_events, public.support_access_grants, public.marketplace_items to authenticated;
grant select (id, item_id, version, manifest, findings, created_at) on public.marketplace_versions to authenticated;
grant select (id, project_id, org_id, site_key, allowed_origins, created_at) on public.analytics_sites to authenticated;
revoke all on function public.expire_support_grants() from authenticated;
revoke all on function public.analytics_salt_for(date) from authenticated;

select keelwork.finish_migration('20261107001200_phase12_platform');
