-- Per-project stack choice: backend and deploy target, chosen before the
-- first build and fixed after it. Deployments take their provider from
-- the project's deploy target; Cloudflare Workers is the default.

alter table public.projects
  add column backend text not null default 'supabase' check (backend in ('supabase', 'cloudbase', 'appwrite', 'postgres')),
  add column deploy_target text not null default 'cloudflare' check (deploy_target in ('cloudflare', 'vercel'));

alter table public.deployments drop constraint deployments_provider;
alter table public.deployments add constraint deployments_provider check (provider in ('vercel', 'cloudflare'));
alter table public.deployments alter column provider set default 'cloudflare';

create or replace function public.set_project_stack(p_project uuid, p_backend text, p_deploy_target text) returns void
language plpgsql security definer set search_path = '' as $$
declare pr public.projects;
begin
  select * into pr from public.projects where id = p_project for update;
  if not found then raise exception 'project not found'; end if;
  perform public._require(pr.org_id, 'project.write');
  if pr.status = 'archived' then raise exception 'project is archived'; end if;
  if p_backend not in ('supabase', 'cloudbase', 'appwrite', 'postgres') then raise exception 'unknown backend'; end if;
  if p_deploy_target not in ('cloudflare', 'vercel') then raise exception 'unknown deploy target'; end if;
  if exists (select 1 from public.agent_runs where project_id = p_project) then
    raise exception 'the stack is fixed after the first build';
  end if;
  update public.projects set backend = p_backend, deploy_target = p_deploy_target where id = p_project;
  perform public._audit(pr.org_id, 'project.stack_set', 'project', p_project::text, jsonb_build_object('backend', p_backend, 'deploy_target', p_deploy_target));
end $$;

-- The provider is never chosen by the caller: it's copied from the project.
create or replace function public._deployment_provider() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select deploy_target into new.provider from public.projects where id = new.project_id;
  return new;
end $$;
create trigger deployments_provider before insert on public.deployments for each row execute function public._deployment_provider();

select keelwork.finish_migration('20261108000100_stack_choice');
