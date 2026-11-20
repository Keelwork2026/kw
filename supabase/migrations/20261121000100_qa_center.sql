-- Quality Assurance Center: QA runs, their results, tracked issues, per-project
-- settings and AI personas. The worker (service role) executes runs and writes
-- results; people request runs, triage issues, accept risks and approve
-- releases through the RPCs below. A result is only ever written by the
-- worker, so nobody can mark a check "passed" by hand.

create table public.qa_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  mode text not null check (mode in ('quick', 'full', 'predeploy', 'custom', 'regression')),
  categories text[] not null check (cardinality(categories) between 1 and 25),
  scope jsonb not null default '{}'::jsonb check (octet_length(scope::text) < 20000),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'stopped', 'error')),
  trigger text not null default 'manual' check (trigger in ('manual', 'after_build', 'retest', 'predeploy')),
  stop_requested boolean not null default false,
  progress jsonb not null default '{}'::jsonb,
  profile jsonb,
  scores jsonb,
  readiness jsonb,
  comparison jsonb,
  outcomes jsonb,
  commit text,
  error text check (error is null or char_length(error) <= 2000),
  log text check (log is null or char_length(log) <= 200000),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approval_note text check (approval_note is null or char_length(approval_note) <= 1000),
  worker text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create unique index qa_runs_one_active on public.qa_runs(project_id) where status in ('queued', 'running');
create index qa_runs_project on public.qa_runs(project_id, created_at desc);
create trigger qa_runs_org before insert on public.qa_runs for each row execute function public._inherit_org_from_project();

create table public.qa_issues (
  id uuid primary key default gen_random_uuid(),
  ref integer not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{16,64}$'),
  title text not null check (char_length(title) <= 300),
  category text not null,
  rule text not null check (char_length(rule) <= 100),
  test_key text check (test_key is null or char_length(test_key) <= 400),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  priority text not null check (priority in ('P0', 'P1', 'P2', 'P3', 'P4')),
  confidence text not null check (confidence in ('confirmed', 'probable', 'potential', 'informational', 'needs_manual')),
  status text not null default 'new' check (status in ('new', 'confirmed', 'in_progress', 'awaiting_review', 'fixed', 'awaiting_retest', 'verified', 'rejected', 'false_positive', 'accepted_risk', 'reopened')),
  description text not null check (char_length(description) <= 2000),
  impact text not null check (char_length(impact) <= 1000),
  recommendation text not null check (char_length(recommendation) <= 2000),
  verify text not null check (char_length(verify) <= 1000),
  target text check (target is null or char_length(target) <= 400),
  wcag text,
  evidence jsonb not null default '[]'::jsonb check (octet_length(evidence::text) < 400000),
  first_run uuid references public.qa_runs(id) on delete set null,
  last_run uuid references public.qa_runs(id) on delete set null,
  last_seen timestamptz not null default now(),
  history jsonb not null default '[]'::jsonb,
  accepted_reason text,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  accepted_expires date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, fingerprint),
  unique (project_id, ref)
);
create index qa_issues_open on public.qa_issues(project_id, status, severity);
create trigger qa_issues_org before insert on public.qa_issues for each row execute function public._inherit_org_from_project();

create table public.qa_results (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.qa_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  key text not null check (char_length(key) <= 400),
  name text not null check (char_length(name) <= 400),
  category text not null,
  method text not null check (method in ('automated', 'browser', 'static', 'ai', 'simulated', 'human', 'monitoring')),
  objective text not null default '',
  steps jsonb not null default '[]'::jsonb,
  expected text not null default '',
  actual text not null default '',
  status text not null check (status in ('passed', 'failed', 'blocked', 'skipped', 'not_run', 'in_progress')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  target text,
  evidence jsonb not null default '[]'::jsonb check (octet_length(evidence::text) < 600000),
  duration_ms integer,
  issue_id uuid references public.qa_issues(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (run_id, key)
);
create index qa_results_run on public.qa_results(run_id, category, status);

create table public.qa_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (octet_length(settings::text) < 20000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger qa_settings_org before insert on public.qa_settings for each row execute function public._inherit_org_from_project();

create table public.qa_personas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  description text not null check (char_length(description) between 10 and 600),
  goal text not null check (char_length(goal) between 5 and 300),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create trigger qa_personas_org before insert on public.qa_personas for each row execute function public._inherit_org_from_project();

-- Ask for a run. One active run per project.
create or replace function public.request_qa_run(p_project uuid, p_mode text, p_categories text[], p_scope jsonb default '{}'::jsonb, p_trigger text default 'manual') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.write');
  if p_trigger not in ('manual', 'retest', 'predeploy') then raise exception 'invalid trigger'; end if;
  if exists (select 1 from public.qa_runs where project_id = p_project and status in ('queued', 'running')) then
    raise exception 'a QA run is already in progress for this project';
  end if;
  insert into public.qa_runs (project_id, org_id, mode, categories, scope, trigger, requested_by)
    values (p_project, v_org, p_mode, p_categories, coalesce(p_scope, '{}'::jsonb), p_trigger, auth.uid()) returning id into v_id;
  perform public._audit(v_org, 'qa.requested', 'project', p_project::text, jsonb_build_object('run', v_id, 'mode', p_mode, 'categories', p_categories));
  return v_id;
end $$;

create or replace function public.stop_qa_run(p_run uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.qa_runs;
begin
  select * into r from public.qa_runs where id = p_run for update;
  if not found then raise exception 'run not found'; end if;
  perform public._require(r.org_id, 'project.write');
  if r.status = 'queued' then
    update public.qa_runs set status = 'stopped', stop_requested = true, finished_at = now(), error = 'Stopped before it started.' where id = p_run;
  elsif r.status = 'running' then
    update public.qa_runs set stop_requested = true where id = p_run;
  end if;
  perform public._audit(r.org_id, 'qa.stopped', 'project', r.project_id::text, jsonb_build_object('run', p_run));
end $$;

-- Worker only.
create or replace function public.claim_qa_runs(p_worker text, p_limit integer default 1) returns setof public.qa_runs
language plpgsql security definer set search_path = '' as $$
begin
  update public.qa_runs set status = 'error', error = 'The worker stopped before the run finished; results are incomplete.', finished_at = now()
    where status = 'running' and started_at < now() - interval '60 minutes';
  return query
  update public.qa_runs q set status = 'running', worker = p_worker, started_at = now()
  where q.id in (select id from public.qa_runs where status = 'queued' order by created_at limit greatest(1, least(p_limit, 3)) for update skip locked)
  returning q.*;
end $$;

-- People triage issues. "verified" and "reopened" are set only by retests.
create or replace function public.set_qa_issue_status(p_issue uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.qa_issues;
begin
  select * into i from public.qa_issues where id = p_issue for update;
  if not found then raise exception 'issue not found'; end if;
  perform public._require(i.org_id, 'project.write');
  if p_status not in ('new', 'confirmed', 'in_progress', 'awaiting_review', 'fixed', 'awaiting_retest', 'rejected', 'false_positive') then
    raise exception 'that status is set by retesting, or needs the accept-risk flow';
  end if;
  if p_status in ('rejected', 'false_positive') and char_length(trim(coalesce(p_note, ''))) < 10 then
    raise exception 'explain why (at least 10 characters)';
  end if;
  update public.qa_issues set status = p_status, updated_at = now(),
    history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', auth.uid(), 'from', i.status, 'to', p_status, 'note', left(coalesce(p_note, ''), 500)))
    where id = i.id;
  perform public._audit(i.org_id, 'qa.issue_status', 'project', i.project_id::text, jsonb_build_object('issue', i.id, 'from', i.status, 'to', p_status));
end $$;

create or replace function public.accept_qa_risk(p_issue uuid, p_reason text, p_expires date) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.qa_issues;
begin
  select * into i from public.qa_issues where id = p_issue for update;
  if not found then raise exception 'issue not found'; end if;
  perform public._require(i.org_id, 'project.manage');
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'explain why this risk is acceptable (at least 10 characters)'; end if;
  if p_expires is null or p_expires <= current_date or p_expires > current_date + 365 then raise exception 'choose a review date within the next year'; end if;
  if i.severity = 'critical' and p_expires > current_date + 90 then raise exception 'critical risks must be reviewed within 90 days'; end if;
  if i.rule in ('public-secret-env', 'service-role-in-client', 'live-keys') then raise exception 'exposed credentials cannot be accepted as a risk; rotate and remove them'; end if;
  update public.qa_issues set status = 'accepted_risk', accepted_reason = left(trim(p_reason), 1000), accepted_by = auth.uid(), accepted_at = now(), accepted_expires = p_expires, updated_at = now(),
    history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', auth.uid(), 'from', i.status, 'to', 'accepted_risk', 'note', left(trim(p_reason), 500)))
    where id = i.id;
  perform public._audit(i.org_id, 'qa.risk_accepted', 'project', i.project_id::text, jsonb_build_object('issue', i.id, 'severity', i.severity, 'expires', p_expires, 'reason', left(trim(p_reason), 300)));
end $$;

-- Settings: managers only. Penetration-test authorisation is kept as it is;
-- it changes only through authorize_qa_pentest.
create or replace function public.save_qa_settings(p_project uuid, p_settings jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_prev jsonb;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.manage');
  if jsonb_typeof(p_settings) <> 'object' then raise exception 'settings must be an object'; end if;
  select settings into v_prev from public.qa_settings where project_id = p_project;
  insert into public.qa_settings (project_id, org_id, settings, updated_by)
    values (p_project, v_org, (p_settings - 'pentestAuthorized') || jsonb_build_object('pentestAuthorized', coalesce(v_prev -> 'pentestAuthorized', 'null'::jsonb)), auth.uid())
  on conflict (project_id) do update set settings = excluded.settings, updated_by = auth.uid(), updated_at = now();
  perform public._audit(v_org, 'qa.settings_saved', 'project', p_project::text, '{}'::jsonb);
end $$;

create or replace function public.authorize_qa_pentest(p_project uuid, p_scope text, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_auth jsonb;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.manage');
  if p_on and char_length(trim(coalesce(p_scope, ''))) < 10 then raise exception 'describe the scope (at least 10 characters)'; end if;
  v_auth := case when p_on then jsonb_build_object('by', auth.uid(), 'at', now(), 'scope', left(trim(p_scope), 500)) else 'null'::jsonb end;
  insert into public.qa_settings (project_id, org_id, settings, updated_by) values (p_project, v_org, jsonb_build_object('pentestAuthorized', v_auth), auth.uid())
  on conflict (project_id) do update set settings = public.qa_settings.settings || jsonb_build_object('pentestAuthorized', v_auth), updated_by = auth.uid(), updated_at = now();
  perform public._audit(v_org, case when p_on then 'qa.pentest_authorized' else 'qa.pentest_revoked' end, 'project', p_project::text, jsonb_build_object('scope', left(coalesce(p_scope, ''), 300)));
end $$;

create or replace function public.approve_qa_release(p_run uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.qa_runs;
begin
  select * into r from public.qa_runs where id = p_run for update;
  if not found then raise exception 'run not found'; end if;
  perform public._require(r.org_id, 'project.manage');
  if r.status <> 'completed' then raise exception 'only a completed QA run can be approved'; end if;
  if coalesce(r.readiness ->> 'status', '') not in ('ready', 'conditional') then raise exception 'this run has blocking issues or missing checks; resolve them before approving'; end if;
  if r.id <> (select id from public.qa_runs where project_id = r.project_id and status = 'completed' order by created_at desc limit 1) then raise exception 'approve the latest completed run'; end if;
  update public.qa_runs set approved_by = auth.uid(), approved_at = now(), approval_note = left(coalesce(p_note, ''), 1000),
    readiness = readiness || jsonb_build_object('status', 'approved') where id = p_run;
  perform public._audit(r.org_id, 'qa.release_approved', 'project', r.project_id::text, jsonb_build_object('run', p_run, 'from', r.readiness ->> 'status'));
end $$;

-- Optional: a Quick QA run after each successful agent build.
create or replace function public._qa_after_build() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'succeeded' and old.status is distinct from 'succeeded'
     and exists (select 1 from public.qa_settings s where s.project_id = new.project_id and (s.settings ->> 'autoAfterBuild')::boolean is true)
     and not exists (select 1 from public.qa_runs q where q.project_id = new.project_id and q.status in ('queued', 'running')) then
    insert into public.qa_runs (project_id, org_id, mode, categories, scope, trigger)
      values (new.project_id, new.org_id, 'regression', array['functional', 'build', 'regression', 'api', 'security', 'accessibility', 'responsive'], jsonb_build_object('changedOnly', true), 'after_build');
  end if;
  return new;
end $$;
create trigger agent_runs_qa_after_build after update of status on public.agent_runs for each row execute function public._qa_after_build();

-- Optional release gate: production deployments (not rollbacks) need the
-- latest QA run to be ready, conditional or approved.
create or replace function public._qa_deploy_gate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if new.environment = 'production' and new.kind = 'deploy'
     and exists (select 1 from public.qa_settings s where s.project_id = new.project_id and (s.settings -> 'gate' ->> 'enforceOnDeploy')::boolean is true) then
    select readiness ->> 'status' into v_status from public.qa_runs where project_id = new.project_id and status = 'completed' order by created_at desc limit 1;
    if coalesce(v_status, 'not_tested') not in ('ready', 'conditional', 'approved') then
      raise exception 'QA release gate: the latest QA run is %; production deployments need it to be ready or approved', replace(coalesce(v_status, 'not tested'), '_', ' ');
    end if;
  end if;
  return new;
end $$;
create trigger deployments_qa_gate before insert on public.deployments for each row execute function public._qa_deploy_gate();
revoke all on function public._qa_deploy_gate() from public, anon, authenticated;

alter table public.qa_runs enable row level security;
alter table public.qa_results enable row level security;
alter table public.qa_issues enable row level security;
alter table public.qa_settings enable row level security;
alter table public.qa_personas enable row level security;
create policy qa_runs_select on public.qa_runs for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy qa_results_select on public.qa_results for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy qa_issues_select on public.qa_issues for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy qa_settings_select on public.qa_settings for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy qa_personas_select on public.qa_personas for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy qa_personas_insert on public.qa_personas for insert to authenticated with check (public.has_permission(org_id, 'project.write') and created_by = auth.uid());
create policy qa_personas_delete on public.qa_personas for delete to authenticated using (public.has_permission(org_id, 'project.write'));

revoke all on public.qa_runs, public.qa_results, public.qa_issues, public.qa_settings, public.qa_personas from anon, authenticated;
revoke all on sequence public.qa_results_id_seq from anon, authenticated;
grant select on public.qa_runs, public.qa_results, public.qa_issues, public.qa_settings to authenticated;
grant select, insert, delete on public.qa_personas to authenticated;
revoke all on function public.claim_qa_runs(text, integer) from public, anon, authenticated;
revoke all on function public._qa_after_build() from public, anon, authenticated;
grant execute on function public.claim_qa_runs(text, integer) to service_role;

select keelwork.finish_migration('20261121000100_qa_center');
