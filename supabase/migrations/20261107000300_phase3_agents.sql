-- Phase 3: multi-agent build engine — plans, approvals, runs, task graph,
-- file locks, tool-call log.

create type public.plan_status as enum ('draft', 'approved', 'superseded', 'rejected');
create type public.run_status as enum ('queued', 'running', 'waiting_approval', 'paused', 'succeeded', 'failed', 'cancelled');
create type public.task_status as enum ('blocked', 'ready', 'running', 'review', 'waiting_approval', 'done', 'failed', 'cancelled');
create type public.tool_decision as enum ('allow', 'require_approval', 'deny');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'expired');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid references public.threads(id) on delete set null,
  content jsonb not null,
  status public.plan_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index plans_project_idx on public.plans(project_id, created_at desc);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status public.run_status not null default 'queued',
  started_by uuid references auth.users(id) on delete set null,
  worker text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
-- One active build per project.
create unique index agent_runs_one_active on public.agent_runs(project_id)
  where status in ('queued', 'running', 'waiting_approval', 'paused');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9._-]{0,79}$'),
  agent text not null check (agent in ('architect', 'database', 'backend', 'frontend', 'integrations', 'qa', 'security', 'docs')),
  title text not null,
  status public.task_status not null default 'blocked',
  attempts integer not null default 0,
  turns integer not null default 0,
  summary text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, key)
);

create table public.task_edges (
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  from_task uuid not null references public.tasks(id) on delete cascade,
  to_task uuid not null references public.tasks(id) on delete cascade,
  primary key (from_task, to_task),
  check (from_task <> to_task)
);

create table public.file_locks (
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 300),
  org_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  holder text not null,
  acquired_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  primary key (project_id, path)
);

create table public.tool_calls (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  agent text not null,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  decision public.tool_decision not null,
  reason text,
  result_summary text,
  created_at timestamptz not null default now()
);
create index tool_calls_run_idx on public.tool_calls(run_id, created_at);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  kind text not null check (kind in ('install_package', 'publish_code', 'discard_changes', 'destructive_migration',
    'delete_file', 'send_message', 'deploy_production', 'fetch_host', 'secret_request', 'reset_database')),
  summary text not null check (char_length(summary) between 1 and 500),
  details jsonb not null default '{}'::jsonb,
  status public.approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 500)
);
create index approvals_project_idx on public.approvals(project_id, status);

-- Inheritance and housekeeping triggers
create trigger plans_org before insert or update of project_id on public.plans
  for each row execute function public._inherit_org_from_project();
create trigger runs_org before insert or update of project_id on public.agent_runs
  for each row execute function public._inherit_org_from_project();
create trigger tasks_org before insert or update of project_id on public.tasks
  for each row execute function public._inherit_org_from_project();
create trigger locks_org before insert or update of project_id on public.file_locks
  for each row execute function public._inherit_org_from_project();
create trigger tool_calls_org before insert on public.tool_calls
  for each row execute function public._inherit_org_from_project();
create trigger approvals_org before insert or update of project_id on public.approvals
  for each row execute function public._inherit_org_from_project();

create or replace function public._inherit_org_from_run() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select org_id into new.org_id from public.agent_runs where id = new.run_id;
  if new.org_id is null then raise exception 'run not found'; end if;
  return new;
end $$;
create trigger task_edges_org before insert on public.task_edges
  for each row execute function public._inherit_org_from_run();

create trigger runs_touch before update on public.agent_runs for each row execute function public._touch_updated_at();
create trigger tasks_touch before update on public.tasks for each row execute function public._touch_updated_at();

-- tool_calls is append-only and its decision must match a known value.
create or replace function public._tool_calls_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'tool_calls is append-only' using errcode = 'insufficient_privilege';
  end if;
  if new.decision = 'deny' and coalesce(new.reason, '') = '' then
    raise exception 'denied tool calls need a reason';
  end if;
  return new;
end $$;
create trigger tool_calls_guard before insert or update or delete on public.tool_calls
  for each row execute function public._tool_calls_guard();
create trigger tool_calls_no_truncate before truncate on public.tool_calls
  for each statement execute function public._audit_immutable();

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------
create or replace function public.approve_plan(p_plan uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pl public.plans; pr public.projects; v_run uuid;
begin
  select * into pl from public.plans where id = p_plan for update;
  if not found then raise exception 'plan not found'; end if;
  perform public._require(pl.org_id, 'project.write');
  select * into pr from public.projects where id = pl.project_id for update;
  if pr.status = 'archived' then raise exception 'project is archived'; end if;
  if pl.status <> 'draft' then raise exception 'this plan is no longer open for approval'; end if;
  if exists (select 1 from public.agent_runs where project_id = pl.project_id
             and status in ('queued', 'running', 'waiting_approval', 'paused')) then
    raise exception 'a build is already running for this project';
  end if;

  update public.plans set status = 'superseded' where project_id = pl.project_id and status = 'draft' and id <> pl.id;
  update public.plans set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = pl.id;
  insert into public.agent_runs(project_id, org_id, plan_id, started_by) values (pl.project_id, pl.org_id, pl.id, auth.uid())
  returning id into v_run;
  update public.projects set status = 'building' where id = pl.project_id;
  perform public._audit(pl.org_id, 'plan.approved', 'plan', pl.id::text, jsonb_build_object('run', v_run));
  return v_run;
end $$;

create or replace function public.decide_approval(p_approval uuid, p_approve boolean, p_note text default null)
returns public.approval_status
language plpgsql security definer set search_path = '' as $$
declare a public.approvals; v_status public.approval_status;
begin
  select * into a from public.approvals where id = p_approval for update;
  if not found then raise exception 'approval not found'; end if;
  perform public._require(a.org_id, case when a.kind in ('deploy_production', 'destructive_migration', 'reset_database', 'publish_code')
                                         then 'project.manage' else 'project.write' end);
  if a.status <> 'pending' then raise exception 'this request was already decided'; end if;
  if a.expires_at <= now() then
    update public.approvals set status = 'expired' where id = a.id;
    -- Commit the expiry: return rather than raise, so the row stays expired.
    perform public._audit(a.org_id, 'approval.expired', 'approval', a.id::text, jsonb_build_object('kind', a.kind));
    return 'expired';
  end if;
  v_status := case when p_approve then 'approved' else 'rejected' end;
  update public.approvals set status = v_status, decided_by = auth.uid(), decided_at = now(),
    decision_note = nullif(left(coalesce(p_note, ''), 500), '')
  where id = a.id;
  -- A waiting run resumes once nothing else is pending.
  if a.run_id is not null and not exists (select 1 from public.approvals where run_id = a.run_id and status = 'pending') then
    update public.agent_runs set status = 'queued' where id = a.run_id and status = 'waiting_approval';
  end if;
  if a.task_id is not null then
    update public.tasks set status = (case when p_approve then 'ready' else 'failed' end)::public.task_status,
      error = case when p_approve then error else 'A person declined: ' || a.summary end
    where id = a.task_id and status = 'waiting_approval';
  end if;
  perform public._audit(a.org_id, 'approval.' || v_status::text, 'approval', a.id::text, jsonb_build_object('kind', a.kind));
  return v_status;
end $$;

create or replace function public.control_run(p_run uuid, p_action text) returns public.run_status
language plpgsql security definer set search_path = '' as $$
declare r public.agent_runs; v_new public.run_status;
begin
  select * into r from public.agent_runs where id = p_run for update;
  if not found then raise exception 'run not found'; end if;
  perform public._require(r.org_id, 'project.write');
  if p_action = 'pause' then
    if r.status not in ('queued', 'running', 'waiting_approval') then raise exception 'only an active build can be paused'; end if;
    v_new := 'paused';
  elsif p_action = 'resume' then
    if r.status <> 'paused' then raise exception 'only a paused build can be resumed'; end if;
    v_new := 'queued';
  elsif p_action = 'cancel' then
    if r.status in ('succeeded', 'failed', 'cancelled') then raise exception 'this build has already finished'; end if;
    v_new := 'cancelled';
  else
    raise exception 'unknown action';
  end if;

  update public.agent_runs set status = v_new, worker = null,
    finished_at = case when v_new = 'cancelled' then now() else finished_at end where id = r.id;
  -- Pausing or cancelling releases the run's file locks so people can edit.
  delete from public.file_locks where run_id = r.id;
  if v_new = 'cancelled' then
    update public.tasks set status = 'cancelled' where run_id = r.id and status not in ('done', 'failed', 'cancelled');
    update public.approvals set status = 'expired' where run_id = r.id and status = 'pending';
    update public.projects set status = case when exists (select 1 from public.agent_runs where project_id = r.project_id and status = 'succeeded') then 'live'::public.project_status else 'draft'::public.project_status end
    where id = r.project_id and status = 'building';
  elsif v_new = 'paused' then
    update public.tasks set status = 'ready' where run_id = r.id and status = 'running';
  end if;
  perform public._audit(r.org_id, 'run.' || p_action, 'run', r.id::text, '{}'::jsonb);
  return v_new;
end $$;

-- Worker-only (service role). A stale lock — no heartbeat for 10 minutes,
-- or held by a run that is no longer active — is taken over.
create or replace function public.acquire_file_lock(p_project uuid, p_path text, p_run uuid, p_task uuid, p_holder text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.file_locks;
begin
  select * into l from public.file_locks where project_id = p_project and path = p_path for update;
  if not found then
    insert into public.file_locks(project_id, path, run_id, task_id, holder) values (p_project, p_path, p_run, p_task, p_holder)
    on conflict do nothing;
    return found;
  end if;
  if l.run_id is not distinct from p_run and l.task_id is not distinct from p_task then
    update public.file_locks set heartbeat_at = now() where project_id = p_project and path = p_path;
    return true;
  end if;
  if l.heartbeat_at < now() - interval '10 minutes'
     or not exists (select 1 from public.agent_runs where id = l.run_id and status in ('queued', 'running', 'waiting_approval')) then
    update public.file_locks set run_id = p_run, task_id = p_task, holder = p_holder, acquired_at = now(), heartbeat_at = now()
    where project_id = p_project and path = p_path;
    return true;
  end if;
  return false;
end $$;

create or replace function public.release_file_locks(p_run uuid, p_task uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.file_locks where run_id = p_run and (p_task is null or task_id = p_task);
  get diagnostics n = row_count;
  return n;
end $$;


-- Worker-only: lease queued runs. A run whose worker vanished (no update
-- for 15 minutes while running) is re-queued and claimed again.
create or replace function public.claim_agent_runs(p_worker text, p_limit integer default 1)
returns setof public.agent_runs
language plpgsql security definer set search_path = '' as $$
begin
  update public.agent_runs set status = 'queued', worker = null
  where status = 'running' and updated_at < now() - interval '15 minutes';
  return query
  update public.agent_runs r set status = 'running', worker = p_worker, started_at = coalesce(r.started_at, now())
  where r.id in (
    select id from public.agent_runs where status = 'queued'
    order by created_at limit greatest(1, least(p_limit, 20))
    for update skip locked
  )
  returning r.*;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.agent_runs enable row level security;
alter table public.tasks enable row level security;
alter table public.task_edges enable row level security;
alter table public.file_locks enable row level security;
alter table public.tool_calls enable row level security;
alter table public.approvals enable row level security;

create policy plans_select on public.plans for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy runs_select on public.agent_runs for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy tasks_select on public.tasks for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy edges_select on public.task_edges for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy locks_select on public.file_locks for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy tool_calls_select on public.tool_calls for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy approvals_select on public.approvals for select to authenticated using (public.has_permission(org_id, 'project.read'));

revoke all on public.plans, public.agent_runs, public.tasks, public.task_edges, public.file_locks,
  public.tool_calls, public.approvals from anon, authenticated;
revoke all on sequence public.tool_calls_id_seq from anon, authenticated;
grant select on public.plans, public.agent_runs, public.tasks, public.task_edges, public.file_locks,
  public.tool_calls, public.approvals to authenticated;

revoke all on function public.acquire_file_lock(uuid, text, uuid, uuid, text) from authenticated;
revoke all on function public.release_file_locks(uuid, uuid) from authenticated;
revoke all on function public.claim_agent_runs(text, integer) from authenticated;

select keelwork.finish_migration('20261107000300_phase3_agents');
