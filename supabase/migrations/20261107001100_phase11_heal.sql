-- Phase 11: self-healing incidents and predictive test selection.

alter table public.check_runs drop constraint check_runs_kind;
alter table public.check_runs add constraint check_runs_kind
  check (kind in ('tests', 'affected_tests', 'lint', 'typecheck', 'build', 'audit', 'secrets', 'review'));

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  source text not null check (source in ('check', 'deployment', 'workflow')),
  signature text not null check (char_length(signature) between 1 and 200),
  title text not null check (char_length(title) <= 300),
  detail jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'fix_proposed', 'resolved', 'dismissed')),
  count integer not null default 1 check (count >= 1),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  dismissed_by uuid references auth.users(id) on delete set null,
  dismissed_reason text,
  fix_message_id uuid references public.messages(id) on delete set null
);
-- Grouped by signature: one active incident per signature per project.
create unique index incidents_one_active on public.incidents(project_id, signature) where status in ('open', 'fix_proposed');
create index incidents_project_idx on public.incidents(project_id, last_seen desc);

create or replace function public._record_incident(p_project uuid, p_source text, p_signature text, p_title text, p_detail jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  update public.incidents set count = count + 1, last_seen = now(), detail = coalesce(p_detail, detail), title = left(p_title, 300)
  where project_id = p_project and signature = p_signature and status in ('open', 'fix_proposed');
  if not found then
    insert into public.incidents(project_id, org_id, source, signature, title, detail)
    values (p_project, v_org, p_source, p_signature, left(p_title, 300), coalesce(p_detail, '{}'::jsonb));
  end if;
end $$;

create or replace function public._resolve_incidents(p_project uuid, p_signature text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.incidents set status = 'resolved', resolved_at = now()
  where project_id = p_project and signature = p_signature and status in ('open', 'fix_proposed');
end $$;

create or replace function public._incidents_from_checks() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_sig text := 'check:' || case when new.kind = 'affected_tests' then 'tests' else new.kind end;
begin
  if new.status in ('failed', 'error') and old.status not in ('failed', 'error') then
    perform public._record_incident(new.project_id, 'check', v_sig,
      initcap(replace(new.kind, '_', ' ')) || case when new.status = 'error' then ' could not run' else ' failed' end,
      jsonb_build_object('check_run', new.id, 'exit_code', new.exit_code, 'summary', new.summary, 'output_tail', right(coalesce(new.output, ''), 4000)));
  elsif new.status = 'passed' and old.status <> 'passed' and new.kind <> 'affected_tests' then
    -- A selective test pass never closes an incident: only a full run can.
    perform public._resolve_incidents(new.project_id, v_sig);
  end if;
  return new;
end $$;
create trigger check_runs_incidents after update of status on public.check_runs for each row execute function public._incidents_from_checks();

create or replace function public._incidents_from_deployments() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'failed' and old.status <> 'failed' then
    perform public._record_incident(new.project_id, 'deployment', 'deploy:' || new.environment,
      initcap(new.environment) || ' deployment failed', jsonb_build_object('deployment', new.id, 'error', new.error, 'provider', new.provider));
  elsif new.status = 'live' and old.status <> 'live' then
    perform public._resolve_incidents(new.project_id, 'deploy:' || new.environment);
  end if;
  return new;
end $$;
create trigger deployments_incidents after update of status on public.deployments for each row execute function public._incidents_from_deployments();

create or replace function public._incidents_from_workflows() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if new.status = 'failed' and old.status <> 'failed' then
    select name into v_name from public.workflows where id = new.workflow_id;
    perform public._record_incident(new.project_id, 'workflow', 'workflow:' || new.workflow_id,
      'Automation "' || coalesce(v_name, '?') || '" failed', jsonb_build_object('run', new.id, 'error', new.error));
  elsif new.status = 'succeeded' and old.status <> 'succeeded' then
    perform public._resolve_incidents(new.project_id, 'workflow:' || new.workflow_id);
  end if;
  return new;
end $$;
create trigger workflow_runs_incidents after update of status on public.workflow_runs for each row execute function public._incidents_from_workflows();

-- Posts the repair request to the project thread; planning mode answers it.
create or replace function public.request_fix(p_incident uuid, p_request text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.incidents; v_thread uuid; v_msg uuid;
begin
  select * into i from public.incidents where id = p_incident for update;
  if not found then raise exception 'incident not found'; end if;
  perform public._require(i.org_id, 'project.write');
  if i.status <> 'open' then raise exception 'only open incidents can get a fix proposal'; end if;
  if p_request is null or char_length(p_request) not between 20 and 40000 then raise exception 'the repair request is empty or too long'; end if;
  select id into v_thread from public.threads where project_id = i.project_id order by created_at limit 1;
  insert into public.messages(thread_id, org_id, role, content, author_id, metadata)
  values (v_thread, i.org_id, 'user', p_request, auth.uid(), jsonb_build_object('incident', i.id)) returning id into v_msg;
  update public.incidents set status = 'fix_proposed', fix_message_id = v_msg where id = i.id;
  perform public._audit(i.org_id, 'incident.fix_requested', 'project', i.project_id::text, jsonb_build_object('incident', i.id, 'signature', i.signature));
  return v_msg;
end $$;

create or replace function public.dismiss_incident(p_incident uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.incidents;
begin
  select * into i from public.incidents where id = p_incident for update;
  if not found then raise exception 'incident not found'; end if;
  perform public._require(i.org_id, 'project.write');
  if i.status not in ('open', 'fix_proposed') then raise exception 'this incident is already closed'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'say why you are dismissing it'; end if;
  update public.incidents set status = 'dismissed', dismissed_by = auth.uid(), dismissed_reason = left(trim(p_reason), 500), resolved_at = now() where id = i.id;
  perform public._audit(i.org_id, 'incident.dismissed', 'project', i.project_id::text, jsonb_build_object('incident', i.id, 'reason', left(trim(p_reason), 200)));
end $$;

alter table public.incidents enable row level security;
create policy incidents_select on public.incidents for select to authenticated using (public.has_permission(org_id, 'project.read'));
revoke all on public.incidents from anon, authenticated;
grant select on public.incidents to authenticated;

select keelwork.finish_migration('20261107001100_phase11_heal');
