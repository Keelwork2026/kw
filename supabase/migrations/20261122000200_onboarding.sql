-- Onboarding and profile settings.
--  * profiles.experience: what the person told us about their coding
--    experience; it only changes how much in-app guidance is shown.
--  * profiles.onboarded_at: when they finished (or skipped) the welcome
--    flow, so it's offered once and never forced.
--  * rename_organization: owners and admins rename their organization
--    (there was no way to before), audited.

alter table public.profiles
  add column experience text check (experience is null or experience in ('new', 'some', 'developer')),
  add column onboarded_at timestamptz;

grant update (display_name, experience, onboarded_at, updated_at) on public.profiles to authenticated;

create or replace function public.rename_organization(p_org uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  perform public._require(p_org, 'org.manage');
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'organization name must be 1-80 characters';
  end if;
  select name into v_old from public.organizations where id = p_org for update;
  if v_old is null then raise exception 'organization not found'; end if;
  update public.organizations set name = trim(p_name) where id = p_org;
  perform public._audit(p_org, 'org.renamed', 'organization', p_org::text, jsonb_build_object('from', v_old, 'to', trim(p_name)));
end $$;

revoke all on function public.rename_organization(uuid, text) from public, anon;
grant execute on function public.rename_organization(uuid, text) to authenticated;

select keelwork.finish_migration('20261122000200_onboarding');
