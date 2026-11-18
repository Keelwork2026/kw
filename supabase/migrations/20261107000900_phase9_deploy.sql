-- Phase 9: deployments with a lifecycle enforced in the database, atomic
-- go-live (one live deployment per environment), rollbacks and exports.

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  environment text not null check (environment in ('preview', 'production')),
  kind text not null default 'deploy' check (kind in ('deploy', 'rollback')),
  provider text not null default 'vercel',
  status text not null default 'queued',
  url text,
  version_id text,
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,64}$'),
  rollback_of uuid references public.deployments(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_agent boolean not null default false,
  approval_id uuid references public.approvals(id) on delete set null,
  confirmed boolean not null default false,
  log jsonb not null default '[]'::jsonb,
  error text,
  worker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  live_at timestamptz,
  constraint deployments_provider check (provider in ('vercel')),
  constraint deployments_status check (status in ('queued', 'collecting', 'uploading', 'building', 'verifying', 'live', 'done', 'failed', 'superseded', 'rolled_back', 'cancelled'))
);
create unique index deployments_one_live on public.deployments(project_id, environment) where status = 'live';
create unique index deployments_one_active on public.deployments(project_id, environment) where status in ('queued', 'collecting', 'uploading', 'building', 'verifying');
create index deployments_project_idx on public.deployments(project_id, created_at desc);
create trigger deployments_org before insert on public.deployments for each row execute function public._inherit_org_from_project();
create trigger deployments_touch before update on public.deployments for each row execute function public._touch_updated_at();

-- The lifecycle can't be skipped: queued → collecting → uploading →
-- building → verifying → live. Nothing reaches live without verifying.
create or replace function public._deployments_lifecycle() returns trigger
language plpgsql set search_path = '' as $$
declare ok boolean;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'queued' then raise exception 'deployments start queued'; end if;
    return new;
  end if;
  if new.status = old.status then return new; end if;
  ok := case old.status
    when 'queued' then new.status in ('collecting', 'failed', 'cancelled')
    when 'collecting' then new.status in ('uploading', 'failed', 'cancelled')
    when 'uploading' then new.status in ('building', 'failed', 'cancelled')
    when 'building' then new.status in ('verifying', 'failed', 'cancelled')
    when 'verifying' then new.status in ('live', 'done', 'failed')
    when 'live' then new.status in ('superseded', 'rolled_back')
    else false end;
  if not ok then raise exception 'a deployment cannot go from % to %', old.status, new.status; end if;
  return new;
end $$;
create trigger deployments_lifecycle before insert or update of status on public.deployments for each row execute function public._deployments_lifecycle();

create or replace function public._deploy_blockers(p_project uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.security_findings where project_id = p_project and severity = 'critical' and status = 'open'
$$;

create or replace function public.request_deployment(p_project uuid, p_environment text, p_confirm boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.manage');
  if p_environment not in ('preview', 'production') then raise exception 'environment must be preview or production'; end if;
  if p_environment = 'production' and not coalesce(p_confirm, false) then raise exception 'confirm the production deployment'; end if;
  if public._deploy_blockers(p_project) > 0 then raise exception 'open critical security findings block deployments'; end if;
  insert into public.deployments(project_id, org_id, environment, requested_by, confirmed)
  values (p_project, v_org, p_environment, auth.uid(), coalesce(p_confirm, false)) returning id into v_id;
  perform public._audit(v_org, 'deployment.requested', 'deployment', v_id::text, jsonb_build_object('environment', p_environment));
  return v_id;
end $$;

-- Agents (via the worker, service role). Production needs a person's approval.
create or replace function public.queue_deployment(p_project uuid, p_environment text, p_task uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid; v_approval uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  if p_environment not in ('preview', 'production') then raise exception 'environment must be preview or production'; end if;
  if p_environment = 'production' then
    select id into v_approval from public.approvals
    where task_id = p_task and project_id = p_project and kind = 'deploy_production' and status = 'approved'
      and not exists (select 1 from public.deployments d where d.approval_id = approvals.id)
    order by decided_at desc limit 1;
    if v_approval is null then raise exception 'a production deployment needs a person''s approval'; end if;
  end if;
  if public._deploy_blockers(p_project) > 0 then raise exception 'open critical security findings block deployments'; end if;
  insert into public.deployments(project_id, org_id, environment, requested_by_agent, approval_id, confirmed)
  values (p_project, v_org, p_environment, true, v_approval, v_approval is not null) returning id into v_id;
  perform public._audit(v_org, 'deployment.requested', 'deployment', v_id::text, jsonb_build_object('environment', p_environment, 'agent', true), null);
  return v_id;
end $$;

create or replace function public.claim_deployments(p_worker text, p_limit integer default 1) returns setof public.deployments
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.deployments d set status = 'collecting', worker = p_worker
  where d.id in (select id from public.deployments where status = 'queued' order by created_at limit greatest(1, least(p_limit, 5)) for update skip locked)
  returning d.*;
end $$;

-- Atomic go-live: the previous live deployment becomes superseded in the
-- same transaction, so there is never more than one live per environment.
create or replace function public.mark_deployment_live(p_deployment uuid, p_url text, p_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.deployments;
begin
  select * into d from public.deployments where id = p_deployment for update;
  if not found then raise exception 'deployment not found'; end if;
  if d.status <> 'verifying' then raise exception 'only a verified deployment can go live'; end if;
  perform 1 from public.deployments where project_id = d.project_id and environment = d.environment and status = 'live' for update;
  update public.deployments set status = case when d.kind = 'rollback' then 'rolled_back' else 'superseded' end
  where project_id = d.project_id and environment = d.environment and status = 'live';
  update public.deployments set status = 'live', url = p_url, version_id = p_version, live_at = now() where id = d.id;
  if d.environment = 'production' then update public.projects set status = 'live' where id = d.project_id and status <> 'archived'; end if;
  perform public._audit(d.org_id, 'deployment.live', 'deployment', d.id::text, jsonb_build_object('environment', d.environment, 'url', p_url, 'kind', d.kind), null);
end $$;

create or replace function public.request_rollback(p_project uuid, p_environment text, p_target uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; t public.deployments; v_id uuid;
begin
  select org_id into v_org from public.projects where id = p_project and status <> 'archived';
  if v_org is null then raise exception 'project not found or archived'; end if;
  perform public._require(v_org, 'project.manage');
  select * into t from public.deployments where id = p_target and project_id = p_project and environment = p_environment;
  if not found then raise exception 'that deployment is not part of this environment'; end if;
  if t.version_id is null or t.status not in ('superseded', 'rolled_back', 'done') then raise exception 'only a previous, verified version can be restored'; end if;
  insert into public.deployments(project_id, org_id, environment, kind, provider, version_id, commit_sha, rollback_of, requested_by, confirmed)
  values (p_project, v_org, p_environment, 'rollback', t.provider, t.version_id, t.commit_sha, t.id, auth.uid(), true) returning id into v_id;
  perform public._audit(v_org, 'deployment.rollback_requested', 'deployment', v_id::text, jsonb_build_object('environment', p_environment, 'target', p_target));
  return v_id;
end $$;

create or replace function public.record_export(p_project uuid, p_files integer, p_bytes bigint, p_sha256 text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project not found'; end if;
  -- Exports are for the organization's own members, never support grants.
  if not public.is_org_member(v_org) then raise exception 'permission denied: export' using errcode = 'insufficient_privilege'; end if;
  perform public._require(v_org, 'project.read');
  if p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'invalid checksum'; end if;
  perform public._audit(v_org, 'project.exported', 'project', p_project::text, jsonb_build_object('files', p_files, 'bytes', p_bytes, 'sha256', p_sha256));
end $$;

alter table public.deployments enable row level security;
create policy deployments_select on public.deployments for select to authenticated using (public.has_permission(org_id, 'project.read'));
revoke all on public.deployments from anon, authenticated;
grant select on public.deployments to authenticated;
revoke all on function public.queue_deployment(uuid, text, uuid) from authenticated;
revoke all on function public.claim_deployments(text, integer) from authenticated;
revoke all on function public.mark_deployment_live(uuid, text, text) from authenticated;

select keelwork.finish_migration('20261107000900_phase9_deploy');
