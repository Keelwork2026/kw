-- Staff back office.
--  * Staff are managed in the app by superadmins (no more hand-written SQL),
--    and the last superadmin can't be removed or demoted.
--  * Staff see aggregates and organization METADATA. Looking inside an
--    organization still needs owner-approved support access (phase 12).
--  * Security staff can suspend an organization: its people keep read access
--    (and billing), every write is refused by has_permission, queued work is
--    cancelled, and no new builds, automation runs, deployments, checks or QA
--    runs can be created — enforced in the database, so services can't skip it.
--  * Superadmins can adjust credits (append-only ledger), publish announcements
--    and flip platform switches that the database enforces.
--  * Abuse reports (from anyone, through the server) get a staff queue.
--  * Every staff action is written to platform_audit_events; actions on an
--    organization also go to that organization's own audit log.

alter table public.platform_admins
  add column added_by uuid references auth.users(id) on delete set null,
  add column note text check (note is null or char_length(note) <= 200);

alter table public.organizations
  add column suspended_at timestamptz,
  add column suspended_reason text check (suspended_reason is null or char_length(suspended_reason) between 10 and 500),
  add column suspended_by uuid references auth.users(id) on delete set null;

-- Abuse reports ---------------------------------------------------------------
create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('phishing', 'malware', 'fraud', 'harassment', 'illegal', 'copyright', 'spam', 'other')),
  url text check (url is null or char_length(url) <= 500),
  details text not null check (char_length(details) between 10 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 200),
  reporter_id uuid references auth.users(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'investigating', 'actioned', 'dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution text check (resolution is null or char_length(resolution) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index abuse_reports_status_idx on public.abuse_reports(status, created_at desc);
create trigger abuse_reports_touch before update on public.abuse_reports for each row execute function public._touch_updated_at();

-- Announcements and switches -------------------------------------------------
create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 5 and 300),
  level text not null default 'info' check (level in ('info', 'warning', 'maintenance')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.platform_flags (
  key text primary key check (key in ('signups_open', 'builds_open', 'marketplace_submissions_open')),
  enabled boolean not null default true,
  description text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.platform_flags(key, enabled, description) values
  ('signups_open', true, 'New accounts can be created (email and OAuth).'),
  ('builds_open', true, 'Approved plans can start new agent builds.'),
  ('marketplace_submissions_open', true, 'Workspaces can submit templates to the marketplace.');

create or replace function public.platform_flag(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select enabled from public.platform_flags where key = p_key), true)
$$;

-- Enforcement in the database ----------------------------------------------
-- Suspension: people keep read access (and can sort out billing); nothing else.
create or replace function public.has_permission(p_org uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (
    p_perm in ('org.read', 'project.read', 'audit.read', 'usage.read', 'billing.manage')
    or not exists (select 1 from public.organizations o where o.id = p_org and o.suspended_at is not null)
  ) and (
    exists (
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
  )
$$;

-- No new work for a suspended organization, from any path (people or services).
create or replace function public._guard_new_work() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  v_org := coalesce(new.org_id, (select org_id from public.projects where id = new.project_id));
  if exists (select 1 from public.organizations where id = v_org and suspended_at is not null) then
    raise exception 'this workspace is suspended' using errcode = 'insufficient_privilege';
  end if;
  if tg_table_name = 'agent_runs' and not public.platform_flag('builds_open') then
    raise exception 'new builds are paused by Keelwork right now; try again later' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger zz_guard_new_work before insert on public.agent_runs for each row execute function public._guard_new_work();
create trigger zz_guard_new_work before insert on public.workflow_runs for each row execute function public._guard_new_work();
create trigger zz_guard_new_work before insert on public.deployments for each row execute function public._guard_new_work();
create trigger zz_guard_new_work before insert on public.check_runs for each row execute function public._guard_new_work();
create trigger zz_guard_new_work before insert on public.qa_runs for each row execute function public._guard_new_work();

create or replace function public._guard_marketplace_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.platform_flag('marketplace_submissions_open') then
    raise exception 'marketplace submissions are paused by Keelwork right now' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.organizations where id = new.publisher_org and suspended_at is not null) then
    raise exception 'this workspace is suspended' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger zz_guard_submission before insert on public.marketplace_items for each row execute function public._guard_marketplace_submission();

create or replace function public._guard_signups() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.platform_flag('signups_open') then
    raise exception 'new sign-ups are closed right now' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger aa_guard_signups before insert on auth.users for each row execute function public._guard_signups();

-- Helpers --------------------------------------------------------------------
create or replace function public._require_staff(p_roles text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin(p_roles) then raise exception 'permission denied: platform admin' using errcode = 'insufficient_privilege'; end if;
end $$;

create or replace function public.staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.platform_admins where user_id = auth.uid()
$$;

-- Overview: aggregates only. -------------------------------------------------
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public._require_staff(null);
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'orgs', (select count(*) from public.organizations),
    'orgs_active_7d', (select count(distinct org_id) from public.projects where updated_at >= now() - interval '7 days'),
    'orgs_suspended', (select count(*) from public.organizations where suspended_at is not null),
    'projects', (select count(*) from public.projects where status <> 'archived'),
    'paying_orgs', (select count(*) from public.org_billing where plan_key <> 'free' and coalesce(subscription_status, '') in ('active', 'trialing')),
    'builds_7d', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status::text, count(*) n from public.agent_runs where created_at >= now() - interval '7 days' group by 1) s),
    'deploys_live', (select count(*) from public.deployments where status = 'live'),
    'ai_cost_micros_30d', (select coalesce(sum(cost_micros), 0) from public.usage_events where created_at >= now() - interval '30 days'),
    'purchases_micros_30d', (select coalesce(sum(amount_micros), 0) from public.credit_ledger where kind = 'purchase' and created_at >= now() - interval '30 days'),
    'reports_open', (select count(*) from public.abuse_reports where status in ('open', 'investigating')),
    'appeals_open', (select count(*) from public.policy_events where status = 'appealed'),
    'refusals_7d', (select count(*) from public.policy_events where created_at >= now() - interval '7 days'),
    'marketplace_pending', (select count(*) from public.marketplace_items where status = 'pending_review'),
    'queue', jsonb_build_object(
      'builds_queued', (select count(*) from public.agent_runs where status = 'queued'),
      'builds_running', (select count(*) from public.agent_runs where status = 'running'),
      'oldest_queued_seconds', (select coalesce(extract(epoch from now() - min(created_at))::int, 0) from public.agent_runs where status = 'queued'),
      'automation_queued', (select count(*) from public.workflow_runs where status in ('queued', 'waiting')),
      'deploys_active', (select count(*) from public.deployments where status in ('queued', 'collecting', 'uploading', 'building', 'verifying')),
      'qa_queued', (select count(*) from public.qa_runs where status = 'queued'),
      'checks_queued', (select count(*) from public.check_runs where status = 'queued'),
      'sandboxes_running', (select count(*) from public.sandboxes where status = 'running'),
      'failed_24h', (select count(*) from public.agent_runs where status = 'failed' and created_at >= now() - interval '24 hours')
        + (select count(*) from public.workflow_runs where status = 'failed' and created_at >= now() - interval '24 hours')
        + (select count(*) from public.deployments where status = 'failed' and created_at >= now() - interval '24 hours')
    ),
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'users', (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day')) order by d), '[]'::jsonb)
                       from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d)
  ) into v;
  return v;
end $$;

-- Organizations ----------------------------------------------------------------
drop function public.admin_list_orgs();
create function public.admin_list_orgs()
returns table (id uuid, name text, plan_key text, member_count bigint, project_count bigint, created_at timestamptz, suspended_at timestamptz, last_active timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(null);
  perform public._platform_audit('admin.list_orgs', null, null, '{}'::jsonb);
  return query
  select o.id, o.name, b.plan_key,
    (select count(*) from public.org_members m where m.org_id = o.id and m.status = 'active'),
    (select count(*) from public.projects p where p.org_id = o.id and p.status <> 'archived'),
    o.created_at, o.suspended_at,
    (select max(p.updated_at) from public.projects p where p.org_id = o.id)
  from public.organizations o left join public.org_billing b on b.org_id = o.id
  order by o.created_at desc;
end $$;

create or replace function public.admin_org_detail(p_org uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public._require_staff(array['support', 'security', 'superadmin']);
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'organization not found'; end if;
  perform public._platform_audit('admin.view_org', p_org, null, '{}'::jsonb);
  select jsonb_build_object(
    'id', o.id, 'name', o.name, 'created_at', o.created_at, 'personal', o.personal,
    'suspended_at', o.suspended_at, 'suspended_reason', o.suspended_reason,
    'plan_key', b.plan_key, 'subscription_status', b.subscription_status, 'current_period_end', b.current_period_end,
    'members', (select count(*) from public.org_members m where m.org_id = o.id and m.status = 'active'),
    'owners', (select coalesce(jsonb_agg(u.email order by u.email), '[]'::jsonb) from public.org_members m join auth.users u on u.id = m.user_id where m.org_id = o.id and m.role = 'owner' and m.status = 'active'),
    'projects', (select count(*) from public.projects p where p.org_id = o.id and p.status <> 'archived'),
    'last_active', (select max(updated_at) from public.projects p where p.org_id = o.id),
    'credit_balance_micros', (select coalesce(sum(amount_micros), 0) from public.credit_ledger l where l.org_id = o.id),
    'ai_cost_micros_30d', (select coalesce(sum(cost_micros), 0) from public.usage_events e where e.org_id = o.id and e.created_at >= now() - interval '30 days'),
    'builds_30d', (select count(*) from public.agent_runs r where r.org_id = o.id and r.created_at >= now() - interval '30 days'),
    'deploys_live', (select count(*) from public.deployments d where d.org_id = o.id and d.status = 'live'),
    'refusals', (select count(*) from public.policy_events e where e.org_id = o.id),
    'reports', (select count(*) from public.abuse_reports r where r.org_id = o.id),
    'ledger', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'amount_micros', amount_micros, 'description', description, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
               from (select * from public.credit_ledger l where l.org_id = o.id and l.kind <> 'usage' order by created_at desc limit 20) l)
  ) into v
  from public.organizations o left join public.org_billing b on b.org_id = o.id where o.id = p_org;
  return v;
end $$;

create or replace function public.admin_suspend_org(p_org uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare n_runs int; n_wf int; n_dep int;
begin
  perform public._require_staff(array['security', 'superadmin']);
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'give a reason the workspace will see (at least 10 characters)'; end if;
  update public.organizations set suspended_at = now(), suspended_reason = left(trim(p_reason), 500), suspended_by = auth.uid() where id = p_org and suspended_at is null;
  if not found then raise exception 'organization not found or already suspended'; end if;
  update public.agent_runs set status = 'cancelled', error = 'Workspace suspended by Keelwork.', finished_at = now() where org_id = p_org and status in ('queued', 'running', 'waiting_approval', 'paused');
  get diagnostics n_runs = row_count;
  update public.workflow_runs set status = 'cancelled', error = 'Workspace suspended by Keelwork.', finished_at = now() where org_id = p_org and status in ('queued', 'waiting');
  get diagnostics n_wf = row_count;
  update public.deployments set status = 'cancelled', error = 'Workspace suspended by Keelwork.' where org_id = p_org and status in ('queued', 'collecting', 'uploading', 'building');
  get diagnostics n_dep = row_count;
  perform public._audit(p_org, 'org.suspended', 'organization', p_org::text, jsonb_build_object('reason', left(trim(p_reason), 300)));
  perform public._platform_audit('org.suspended', p_org, p_org::text, jsonb_build_object('reason', left(trim(p_reason), 300), 'cancelled_builds', n_runs, 'cancelled_automation_runs', n_wf, 'cancelled_deployments', n_dep));
end $$;

create or replace function public.admin_unsuspend_org(p_org uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['security', 'superadmin']);
  if char_length(trim(coalesce(p_note, ''))) < 5 then raise exception 'add a short note'; end if;
  update public.organizations set suspended_at = null, suspended_reason = null, suspended_by = null where id = p_org and suspended_at is not null;
  if not found then raise exception 'organization not found or not suspended'; end if;
  perform public._audit(p_org, 'org.unsuspended', 'organization', p_org::text, jsonb_build_object('note', left(trim(p_note), 300)));
  perform public._platform_audit('org.unsuspended', p_org, p_org::text, jsonb_build_object('note', left(trim(p_note), 300)));
end $$;

create or replace function public.admin_adjust_credits(p_org uuid, p_amount_micros bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['superadmin']);
  if p_amount_micros is null or p_amount_micros = 0 or abs(p_amount_micros) > 10000000000 then raise exception 'adjustments must be non-zero and at most $10,000 either way'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'give a reason (at least 10 characters); the workspace sees it'; end if;
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'organization not found'; end if;
  insert into public.credit_ledger(org_id, kind, amount_micros, reference, description)
    values (p_org, 'adjustment', p_amount_micros, 'staff:' || gen_random_uuid()::text, left(trim(p_reason), 300));
  perform public._audit(p_org, 'billing.credit_adjusted', 'organization', p_org::text, jsonb_build_object('amount_micros', p_amount_micros, 'reason', left(trim(p_reason), 300)));
  perform public._platform_audit('billing.credit_adjusted', p_org, p_org::text, jsonb_build_object('amount_micros', p_amount_micros, 'reason', left(trim(p_reason), 300)));
end $$;

-- People ------------------------------------------------------------------------
create or replace function public.admin_find_users(p_query text)
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, staff_role text, orgs jsonb)
language plpgsql security definer set search_path = '' as $$
declare q text := lower(trim(coalesce(p_query, '')));
begin
  perform public._require_staff(array['support', 'security', 'superadmin']);
  if char_length(q) < 3 then raise exception 'search with at least 3 characters'; end if;
  perform public._platform_audit('admin.find_users', null, null, jsonb_build_object('query', left(q, 100)));
  return query
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.banned_until, a.role,
    (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role) order by o.name), '[]'::jsonb)
       from public.org_members m join public.organizations o on o.id = m.org_id where m.user_id = u.id and m.status = 'active')
  from auth.users u left join public.platform_admins a on a.user_id = u.id
  where lower(u.email) like '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
  order by u.created_at desc limit 25;
end $$;

-- Records a staff action on a person's account (the ban itself is done through
-- the Auth admin API by the server, after this check passes). Staff can't be banned.
create or replace function public.admin_user_action(p_user uuid, p_action text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['security', 'superadmin']);
  if p_action not in ('ban', 'unban', 'ban_failed') then raise exception 'unknown action'; end if;
  if p_action = 'ban' and exists (select 1 from public.platform_admins where user_id = p_user) then raise exception 'staff accounts can''t be banned; remove them from staff first'; end if;
  if p_user = auth.uid() then raise exception 'you can''t do this to your own account'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'give a reason (at least 10 characters)'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'user not found'; end if;
  perform public._platform_audit('user.' || p_action, null, p_user::text, jsonb_build_object('reason', left(trim(p_reason), 300)));
end $$;

-- Staff ---------------------------------------------------------------------------
create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, role text, note text, created_at timestamptz, added_by_email text)
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(null);
  return query
  select a.user_id, u.email::text, a.role, a.note, a.created_at, ab.email::text
  from public.platform_admins a join auth.users u on u.id = a.user_id left join auth.users ab on ab.id = a.added_by
  order by a.created_at;
end $$;

create or replace function public.staff_add(p_email text, p_role text, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  perform public._require_staff(array['superadmin']);
  if p_role not in ('support', 'security', 'reviewer', 'superadmin') then raise exception 'unknown role'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if v_user is null then raise exception 'no Keelwork account uses that email; ask them to sign up first'; end if;
  if exists (select 1 from public.platform_admins where user_id = v_user) then raise exception 'already on staff; change their role instead'; end if;
  insert into public.platform_admins(user_id, role, added_by, note) values (v_user, p_role, auth.uid(), nullif(left(trim(coalesce(p_note, '')), 200), ''));
  perform public._platform_audit('staff.added', null, v_user::text, jsonb_build_object('role', p_role));
  return v_user;
end $$;

create or replace function public.staff_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  perform public._require_staff(array['superadmin']);
  if p_role not in ('support', 'security', 'reviewer', 'superadmin') then raise exception 'unknown role'; end if;
  select role into v_old from public.platform_admins where user_id = p_user for update;
  if v_old is null then raise exception 'not on staff'; end if;
  if v_old = 'superadmin' and p_role <> 'superadmin' and (select count(*) from public.platform_admins where role = 'superadmin') <= 1 then
    raise exception 'there must always be at least one superadmin';
  end if;
  update public.platform_admins set role = p_role where user_id = p_user;
  perform public._platform_audit('staff.role_changed', null, p_user::text, jsonb_build_object('from', v_old, 'to', p_role));
end $$;

create or replace function public.staff_remove(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  perform public._require_staff(array['superadmin']);
  select role into v_old from public.platform_admins where user_id = p_user for update;
  if v_old is null then raise exception 'not on staff'; end if;
  if v_old = 'superadmin' and (select count(*) from public.platform_admins where role = 'superadmin') <= 1 then
    raise exception 'there must always be at least one superadmin';
  end if;
  delete from public.platform_admins where user_id = p_user;
  -- Their open support access ends with them.
  update public.support_access_grants set status = 'revoked', revoked_by = auth.uid(), revoked_at = now() where requested_by = p_user and status in ('requested', 'approved');
  perform public._platform_audit('staff.removed', null, p_user::text, jsonb_build_object('role', v_old));
end $$;

-- Abuse reports -----------------------------------------------------------------------
create or replace function public.admin_update_report(p_report uuid, p_status text, p_resolution text, p_assign_to_me boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.abuse_reports;
begin
  perform public._require_staff(array['security', 'superadmin']);
  if p_status not in ('open', 'investigating', 'actioned', 'dismissed') then raise exception 'unknown status'; end if;
  select * into r from public.abuse_reports where id = p_report for update;
  if not found then raise exception 'report not found'; end if;
  if p_status in ('actioned', 'dismissed') and char_length(trim(coalesce(p_resolution, ''))) < 5 then raise exception 'say what was done (at least 5 characters)'; end if;
  update public.abuse_reports set status = p_status,
    resolution = coalesce(nullif(left(trim(coalesce(p_resolution, '')), 1000), ''), resolution),
    assigned_to = case when p_assign_to_me then auth.uid() else assigned_to end
  where id = r.id;
  perform public._platform_audit('report.' || p_status, r.org_id, r.id::text, jsonb_build_object('category', r.category));
end $$;

create or replace function public.admin_link_report(p_report uuid, p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['security', 'superadmin']);
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'organization not found'; end if;
  update public.abuse_reports set org_id = p_org where id = p_report;
  if not found then raise exception 'report not found'; end if;
  perform public._platform_audit('report.linked', p_org, p_report::text, '{}'::jsonb);
end $$;

-- Policy appeals: reviewers, security and superadmins decide (replaces the phase-22 version).
create or replace function public.decide_policy_event(p_event uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.policy_events;
begin
  perform public._require_staff(array['reviewer', 'security', 'superadmin']);
  if p_decision not in ('upheld', 'overturned') then raise exception 'decision must be upheld or overturned'; end if;
  select * into e from public.policy_events where id = p_event for update;
  if not found then raise exception 'not found'; end if;
  if e.status <> 'appealed' then raise exception 'only appealed decisions can be reviewed'; end if;
  if p_note is null or char_length(trim(p_note)) < 5 then raise exception 'add a short note for the person'; end if;
  update public.policy_events set status = p_decision, decided_by = auth.uid(), decided_at = now(), decision_note = left(trim(p_note), 1000) where id = e.id;
  perform public._audit(e.org_id, 'policy.' || p_decision, 'policy_event', e.id::text, jsonb_build_object('rules', e.rules));
  perform public._platform_audit('policy.' || p_decision, e.org_id, e.id::text, jsonb_build_object('rules', e.rules));
end $$;

-- Announcements and switches ------------------------------------------------------------
create or replace function public.admin_publish_announcement(p_message text, p_level text, p_hours integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._require_staff(array['support', 'superadmin']);
  if p_level not in ('info', 'warning', 'maintenance') then raise exception 'unknown level'; end if;
  if p_hours is not null and p_hours not between 1 and 720 then raise exception 'show it for 1 to 720 hours, or until ended'; end if;
  insert into public.platform_announcements(message, level, ends_at, created_by)
    values (trim(p_message), p_level, case when p_hours is null then null else now() + make_interval(hours => p_hours) end, auth.uid()) returning id into v_id;
  perform public._platform_audit('announcement.published', null, v_id::text, jsonb_build_object('level', p_level));
  return v_id;
end $$;

create or replace function public.admin_end_announcement(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['support', 'superadmin']);
  update public.platform_announcements set ends_at = now() where id = p_id and (ends_at is null or ends_at > now()) and starts_at < now();
  if not found then raise exception 'announcement not found or already ended'; end if;
  perform public._platform_audit('announcement.ended', null, p_id::text, '{}'::jsonb);
end $$;

create or replace function public.admin_set_flag(p_key text, p_enabled boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['superadmin']);
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'give a reason (at least 10 characters)'; end if;
  update public.platform_flags set enabled = p_enabled, updated_by = auth.uid(), updated_at = now() where key = p_key;
  if not found then raise exception 'unknown switch'; end if;
  perform public._platform_audit('flag.' || case when p_enabled then 'on' else 'off' end, null, p_key, jsonb_build_object('reason', left(trim(p_reason), 300)));
end $$;

-- Audit log for security and superadmins, newest first, with readable names.
create or replace function public.admin_audit_log(p_action text, p_org uuid, p_before bigint, p_limit integer)
returns table (id bigint, created_at timestamptz, action text, admin_email text, org_id uuid, org_name text, target text, metadata jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff(array['security', 'superadmin']);
  return query
  select e.id, e.created_at, e.action, u.email::text, e.org_id, o.name, e.target, e.metadata
  from public.platform_audit_events e
  left join auth.users u on u.id = e.admin_id
  left join public.organizations o on o.id = e.org_id
  where (p_action is null or e.action like replace(replace(p_action, '%', ''), '_', '\_') || '%')
    and (p_org is null or e.org_id = p_org)
    and (p_before is null or e.id < p_before)
  order by e.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end $$;

-- Row-level security ------------------------------------------------------------------------
alter table public.abuse_reports enable row level security;
alter table public.platform_announcements enable row level security;
alter table public.platform_flags enable row level security;
revoke all on public.abuse_reports, public.platform_announcements, public.platform_flags from anon, authenticated;
grant select on public.abuse_reports, public.platform_announcements, public.platform_flags to authenticated;
create policy abuse_reports_staff on public.abuse_reports for select to authenticated using (public.is_platform_admin(array['security', 'superadmin']));
create policy announcements_active on public.platform_announcements for select to authenticated using (starts_at <= now() and (ends_at is null or ends_at > now()) or public.is_platform_admin());
create policy flags_read on public.platform_flags for select to authenticated using (true);

grant execute on function public.platform_flag(text), public.staff_role(), public.admin_overview(), public.admin_list_orgs(), public.admin_org_detail(uuid),
  public.admin_suspend_org(uuid, text), public.admin_unsuspend_org(uuid, text), public.admin_adjust_credits(uuid, bigint, text),
  public.admin_find_users(text), public.admin_user_action(uuid, text, text), public.admin_list_staff(), public.staff_add(text, text, text),
  public.staff_set_role(uuid, text), public.staff_remove(uuid), public.admin_update_report(uuid, text, text, boolean), public.admin_link_report(uuid, uuid),
  public.decide_policy_event(uuid, text, text), public.admin_publish_announcement(text, text, integer), public.admin_end_announcement(uuid),
  public.admin_set_flag(text, boolean, text), public.admin_audit_log(text, uuid, bigint, integer), public.has_permission(uuid, text)
  to authenticated;

grant execute on function public.platform_flag(text) to service_role;

select keelwork.finish_migration('20261123000100_staff_backoffice');
