-- Phase 7: Automation Studio — workflows, runs with leases, immutable step
-- logs, signed webhook endpoints and a replay-proof delivery ledger.

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  trigger_kind text not null check (trigger_kind in ('manual', 'webhook', 'schedule')),
  schedule text check (schedule is null or char_length(schedule) <= 100),
  definition jsonb not null check (jsonb_typeof(definition) = 'object' and jsonb_typeof(definition -> 'steps') = 'array'
    and jsonb_array_length(definition -> 'steps') between 1 and 25),
  enabled boolean not null default false,
  version integer not null default 1,
  next_run_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trigger_kind <> 'schedule' or schedule is not null)
);

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  trigger_kind text not null check (trigger_kind in ('manual', 'webhook', 'schedule')),
  input jsonb not null default '{}'::jsonb,
  definition jsonb not null,
  workflow_version integer not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled')),
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index workflow_runs_claim_idx on public.workflow_runs(status, next_attempt_at);
create index workflow_runs_wf_idx on public.workflow_runs(workflow_id, created_at desc);

create table public.workflow_run_steps (
  id bigserial primary key,
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  step_id text not null check (step_id ~ '^[a-z][a-z0-9_]{0,39}$'),
  attempt integer not null check (attempt >= 1),
  status text not null check (status in ('succeeded', 'failed', 'skipped')),
  output jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now()
);
create index workflow_run_steps_run_idx on public.workflow_run_steps(run_id, id);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null unique references public.workflows(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  ciphertext text not null, iv text not null, auth_tag text not null, wrapped_key text not null,
  key_version integer not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

create table public.webhook_deliveries (
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  signature_hash text not null check (signature_hash ~ '^[0-9a-f]{64}$'),
  org_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid references public.workflow_runs(id) on delete set null,
  received_at timestamptz not null default now(),
  primary key (endpoint_id, signature_hash)
);

create trigger workflows_org before insert or update of project_id on public.workflows for each row execute function public._inherit_org_from_project();
create trigger workflows_touch before update on public.workflows for each row execute function public._touch_updated_at();
create trigger workflow_runs_org before insert on public.workflow_runs for each row execute function public._inherit_org_from_project();
create trigger webhook_endpoints_org before insert or update of project_id on public.webhook_endpoints for each row execute function public._inherit_org_from_project();

create or replace function public._inherit_org_from_workflow_run() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select org_id into new.org_id from public.workflow_runs where id = new.run_id;
  if new.org_id is null then raise exception 'run not found'; end if;
  return new;
end $$;
create trigger workflow_run_steps_org before insert on public.workflow_run_steps for each row execute function public._inherit_org_from_workflow_run();
create trigger workflow_run_steps_immutable before update or delete on public.workflow_run_steps for each row execute function public._audit_immutable();
create trigger workflow_run_steps_no_truncate before truncate on public.workflow_run_steps for each statement execute function public._audit_immutable();

-- A run's definition snapshot never changes.
create or replace function public._workflow_runs_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.definition is distinct from old.definition or new.workflow_id <> old.workflow_id or new.input is distinct from old.input then
    raise exception 'a run''s definition snapshot is immutable';
  end if;
  return new;
end $$;
create trigger workflow_runs_guard before update on public.workflow_runs for each row execute function public._workflow_runs_guard();

-- ---------------------------------------------------------------------
create or replace function public.save_workflow(p_project uuid, p_workflow uuid, p_name text, p_trigger text, p_schedule text, p_definition jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid := p_workflow;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.write');
  if v_id is null then
    insert into public.workflows(project_id, org_id, name, trigger_kind, schedule, definition, updated_by)
    values (p_project, v_org, trim(p_name), p_trigger, nullif(trim(coalesce(p_schedule, '')), ''), p_definition, auth.uid())
    returning id into v_id;
  else
    -- Saving always produces a draft: switching on is a separate permission.
    update public.workflows set name = trim(p_name), trigger_kind = p_trigger, schedule = nullif(trim(coalesce(p_schedule, '')), ''),
      definition = p_definition, enabled = false, next_run_at = null, version = version + 1, updated_by = auth.uid()
    where id = v_id and project_id = p_project;
    if not found then raise exception 'workflow not found'; end if;
  end if;
  perform public._audit(v_org, 'workflow.saved', 'workflow', v_id::text, jsonb_build_object('name', trim(p_name), 'trigger', p_trigger));
  return v_id;
end $$;

create or replace function public.set_workflow_enabled(p_workflow uuid, p_enabled boolean, p_next_run_at timestamptz default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare w public.workflows;
begin
  select * into w from public.workflows where id = p_workflow for update;
  if not found then raise exception 'workflow not found'; end if;
  perform public._require(w.org_id, 'project.manage');
  if p_enabled and w.trigger_kind = 'schedule' and p_next_run_at is null then raise exception 'scheduled workflows need their next run time'; end if;
  update public.workflows set enabled = p_enabled, next_run_at = case when p_enabled then p_next_run_at end where id = w.id;
  perform public._audit(w.org_id, case when p_enabled then 'workflow.enabled' else 'workflow.disabled' end, 'workflow', w.id::text, '{}'::jsonb);
end $$;

create or replace function public.run_workflow_now(p_workflow uuid, p_input jsonb default '{}'::jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare w public.workflows; v_id uuid;
begin
  select * into w from public.workflows where id = p_workflow;
  if not found then raise exception 'workflow not found'; end if;
  perform public._require(w.org_id, 'project.write');
  if pg_column_size(p_input) > 65536 then raise exception 'input is too large'; end if;
  insert into public.workflow_runs(workflow_id, project_id, org_id, trigger_kind, input, definition, workflow_version, created_by)
  values (w.id, w.project_id, w.org_id, 'manual', coalesce(p_input, '{}'::jsonb), w.definition, w.version, auth.uid())
  returning id into v_id;
  perform public._audit(w.org_id, 'workflow.run_requested', 'workflow', w.id::text, jsonb_build_object('run', v_id));
  return v_id;
end $$;

create or replace function public.cancel_workflow_run(p_run uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.workflow_runs;
begin
  select * into r from public.workflow_runs where id = p_run for update;
  if not found then raise exception 'run not found'; end if;
  perform public._require(r.org_id, 'project.write');
  if r.status not in ('queued', 'running', 'waiting') then raise exception 'this run has already finished'; end if;
  update public.workflow_runs set status = 'cancelled', finished_at = now(), lease_owner = null, lease_expires_at = null where id = r.id;
  perform public._audit(r.org_id, 'workflow.run_cancelled', 'workflow', r.workflow_id::text, jsonb_build_object('run', r.id));
end $$;

-- Runner-only (service role). Leases with FOR UPDATE SKIP LOCKED; expired
-- leases are re-claimed; runaway runs are stopped.
create or replace function public.claim_workflow_runs(p_worker text, p_limit integer default 5, p_lease_seconds integer default 120)
returns setof public.workflow_runs
language plpgsql security definer set search_path = '' as $$
begin
  update public.workflow_runs set status = 'failed', error = 'runaway run stopped', finished_at = now(), lease_owner = null, lease_expires_at = null
  where status in ('queued', 'running', 'waiting') and (attempts >= 100 or created_at < now() - interval '24 hours');
  return query
  update public.workflow_runs r set status = 'running', lease_owner = p_worker,
    lease_expires_at = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 900))),
    attempts = r.attempts + 1, started_at = coalesce(r.started_at, now())
  where r.id in (
    select id from public.workflow_runs
    where (status in ('queued', 'waiting') and next_attempt_at <= now())
       or (status = 'running' and lease_expires_at < now())
    order by next_attempt_at limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  returning r.*;
end $$;

create or replace function public.set_webhook_secret(p_workflow uuid, p_envelope jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare w public.workflows; v_id uuid;
begin
  select * into w from public.workflows where id = p_workflow;
  if not found then raise exception 'workflow not found'; end if;
  perform public._require(w.org_id, 'project.manage');
  if w.trigger_kind <> 'webhook' then raise exception 'only webhook workflows have a signing secret'; end if;
  if coalesce(jsonb_typeof(p_envelope -> 'ciphertext'), '') <> 'string' or coalesce(jsonb_typeof(p_envelope -> 'wrapped_key'), '') <> 'string' then
    raise exception 'the signing secret must be encrypted by the server';
  end if;
  insert into public.webhook_endpoints(workflow_id, project_id, org_id, ciphertext, iv, auth_tag, wrapped_key, key_version)
  values (w.id, w.project_id, w.org_id, p_envelope ->> 'ciphertext', p_envelope ->> 'iv', p_envelope ->> 'auth_tag', p_envelope ->> 'wrapped_key', (p_envelope ->> 'key_version')::int)
  on conflict (workflow_id) do update set ciphertext = excluded.ciphertext, iv = excluded.iv, auth_tag = excluded.auth_tag,
    wrapped_key = excluded.wrapped_key, key_version = excluded.key_version, rotated_at = now()
  returning id into v_id;
  perform public._audit(w.org_id, 'webhook.secret_rotated', 'workflow', w.id::text, '{}'::jsonb);
  return v_id;
end $$;

-- Service only: records a verified delivery once and queues a run.
create or replace function public.record_webhook_delivery(p_endpoint uuid, p_signature_hash text, p_body jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.webhook_endpoints; w public.workflows; v_run uuid;
begin
  select * into e from public.webhook_endpoints where id = p_endpoint;
  if not found then raise exception 'unknown endpoint'; end if;
  select * into w from public.workflows where id = e.workflow_id;
  if not w.enabled then raise exception 'this workflow is switched off'; end if;
  begin
    insert into public.webhook_deliveries(endpoint_id, signature_hash, org_id) values (e.id, p_signature_hash, e.org_id);
  exception when unique_violation then
    raise exception 'replayed delivery refused';
  end;
  insert into public.workflow_runs(workflow_id, project_id, org_id, trigger_kind, input, definition, workflow_version)
  values (w.id, w.project_id, w.org_id, 'webhook', jsonb_build_object('body', coalesce(p_body, 'null'::jsonb)), w.definition, w.version)
  returning id into v_run;
  update public.webhook_deliveries set run_id = v_run where endpoint_id = e.id and signature_hash = p_signature_hash;
  return v_run;
end $$;

alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_run_steps enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
create policy workflows_select on public.workflows for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy workflow_runs_select on public.workflow_runs for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy workflow_run_steps_select on public.workflow_run_steps for select to authenticated using (public.has_permission(org_id, 'project.read'));
create policy webhook_endpoints_select on public.webhook_endpoints for select to authenticated using (public.is_org_member(org_id));

revoke all on public.workflows, public.workflow_runs, public.workflow_run_steps, public.webhook_endpoints, public.webhook_deliveries from anon, authenticated;
revoke all on sequence public.workflow_run_steps_id_seq from anon, authenticated;
grant select on public.workflows, public.workflow_runs, public.workflow_run_steps to authenticated;
grant select (id, workflow_id, project_id, org_id, key_version, created_at, rotated_at) on public.webhook_endpoints to authenticated;
revoke all on function public.claim_workflow_runs(text, integer, integer) from authenticated;
revoke all on function public.record_webhook_delivery(uuid, text, jsonb) from authenticated;

select keelwork.finish_migration('20261107000700_phase7_automation');
