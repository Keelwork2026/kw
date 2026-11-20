-- Restore an archived project. Archiving is no longer one-way: owners and
-- admins can bring a project back, within the plan's project limit (the same
-- limit create_project enforces). The restored status comes from what the
-- project actually has: live if a production deployment is live, otherwise
-- building if a build succeeded, otherwise draft.

create or replace function public.restore_project(p_project uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_status public.project_status; v_new public.project_status; v_max integer; v_used integer;
begin
  select org_id, status into v_org, v_status from public.projects where id = p_project for update;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.manage');
  if v_status <> 'archived' then raise exception 'project is not archived'; end if;

  select p.max_projects into v_max from public.org_billing b join public.billing_plans p on p.key = b.plan_key where b.org_id = v_org;
  if v_max is not null then
    select count(*) into v_used from public.projects where org_id = v_org and status <> 'archived';
    if v_used >= v_max then raise exception 'project limit reached: your plan includes % projects', v_max; end if;
  end if;

  v_new := case
    when exists (select 1 from public.deployments d where d.project_id = p_project and d.environment = 'production' and d.status in ('live', 'done')) then 'live'
    when exists (select 1 from public.agent_runs r where r.project_id = p_project and r.status = 'succeeded') then 'building'
    else 'draft' end;
  update public.projects set status = v_new, archived_at = null where id = p_project;
  perform public._audit(v_org, 'project.restored', 'project', p_project::text, jsonb_build_object('status', v_new));
  return v_new::text;
end $$;

revoke all on function public.restore_project(uuid) from public, anon;
grant execute on function public.restore_project(uuid) to authenticated;

select keelwork.finish_migration('20261122000100_restore_project');
