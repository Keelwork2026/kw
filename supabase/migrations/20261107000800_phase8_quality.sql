-- Phase 8: Testing Centre and Security Centre.

create table public.check_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'passed', 'failed', 'error')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_agent boolean not null default false,
  worker text,
  exit_code integer,
  summary jsonb not null default '{}'::jsonb,
  output text check (output is null or char_length(output) <= 400000),
  selection jsonb,
  duration_ms integer,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint check_runs_kind check (kind in ('tests', 'lint', 'typecheck', 'build', 'audit', 'secrets', 'review'))
);
-- Only one active check of each kind per project.
create unique index check_runs_one_active on public.check_runs(project_id, kind) where status in ('queued', 'running');
create index check_runs_project_idx on public.check_runs(project_id, created_at desc);
create trigger check_runs_org before insert on public.check_runs for each row execute function public._inherit_org_from_project();

create table public.security_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{16,64}$'),
  scanner text not null check (scanner in ('secrets', 'review', 'audit')),
  rule text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'moderate', 'low', 'info')),
  title text not null check (char_length(title) <= 300),
  location text check (location is null or char_length(location) <= 400),
  hint text check (hint is null or char_length(hint) <= 1000),
  is_credential boolean not null default false,
  status text not null default 'open' check (status in ('open', 'resolved', 'accepted')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_reason text,
  accepted_at timestamptz,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  unique (project_id, fingerprint)
);
create index security_findings_open_idx on public.security_findings(project_id, status, severity);
create trigger security_findings_org before insert on public.security_findings for each row execute function public._inherit_org_from_project();

-- A committed credential can never be "accepted": it must be rotated and removed.
create or replace function public._security_findings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'accepted' and new.is_credential then
    raise exception 'committed credentials cannot be accepted as a risk; rotate the key and remove it from the code';
  end if;
  return new;
end $$;
create trigger security_findings_guard before insert or update on public.security_findings for each row execute function public._security_findings_guard();

create or replace function public.request_checks(p_project uuid, p_kinds text[]) returns setof uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; k text; v_id uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.write');
  if p_kinds is null or cardinality(p_kinds) = 0 or cardinality(p_kinds) > 8 then raise exception 'choose 1-8 checks'; end if;
  foreach k in array p_kinds loop
    select id into v_id from public.check_runs where project_id = p_project and kind = k and status in ('queued', 'running');
    if v_id is null then
      insert into public.check_runs(project_id, org_id, kind, requested_by) values (p_project, v_org, k, auth.uid()) returning id into v_id;
    end if;
    return next v_id;
    v_id := null;
  end loop;
  perform public._audit(v_org, 'checks.requested', 'project', p_project::text, jsonb_build_object('kinds', p_kinds));
end $$;

create or replace function public.claim_check_runs(p_worker text, p_limit integer default 2) returns setof public.check_runs
language plpgsql security definer set search_path = '' as $$
begin
  -- A check whose worker vanished is recorded as an error, never as passed.
  update public.check_runs set status = 'error', summary = jsonb_build_object('error', 'the worker stopped before the check finished'), finished_at = now()
  where status = 'running' and started_at < now() - interval '20 minutes';
  return query
  update public.check_runs c set status = 'running', worker = p_worker, started_at = now()
  where c.id in (select id from public.check_runs where status = 'queued' order by created_at limit greatest(1, least(p_limit, 10)) for update skip locked)
  returning c.*;
end $$;

create or replace function public.accept_finding_risk(p_finding uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare f public.security_findings;
begin
  select * into f from public.security_findings where id = p_finding for update;
  if not found then raise exception 'finding not found'; end if;
  perform public._require(f.org_id, 'project.manage');
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'explain why this risk is acceptable (at least 10 characters)'; end if;
  if f.status <> 'open' then raise exception 'only open findings can be accepted'; end if;
  update public.security_findings set status = 'accepted', accepted_by = auth.uid(), accepted_reason = left(trim(p_reason), 1000), accepted_at = now() where id = f.id;
  perform public._audit(f.org_id, 'finding.risk_accepted', 'project', f.project_id::text,
    jsonb_build_object('finding', f.id, 'rule', f.rule, 'severity', f.severity, 'reason', left(trim(p_reason), 300)));
end $$;

create or replace function public.reopen_finding(p_finding uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare f public.security_findings;
begin
  select * into f from public.security_findings where id = p_finding for update;
  if not found then raise exception 'finding not found'; end if;
  perform public._require(f.org_id, 'project.manage');
  if f.status = 'open' then raise exception 'this finding is already open'; end if;
  update public.security_findings set status = 'open', accepted_by = null, accepted_reason = null, accepted_at = null, resolved_at = null where id = f.id;
  perform public._audit(f.org_id, 'finding.reopened', 'project', f.project_id::text, jsonb_build_object('finding', f.id, 'rule', f.rule));
end $$;

alter table public.check_runs enable row level security;
alter table public.security_findings enable row level security;
create policy check_runs_select on public.check_runs for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy security_findings_select on public.security_findings for select to authenticated using (public.has_permission(org_id, 'project.read'));
revoke all on public.check_runs, public.security_findings from anon, authenticated;
grant select on public.check_runs, public.security_findings to authenticated;
revoke all on function public.claim_check_runs(text, integer) from authenticated;

select keelwork.finish_migration('20261107000800_phase8_quality');
