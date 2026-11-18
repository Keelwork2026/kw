-- Phase 4: website import. The person must confirm they own or are
-- authorized to use the site; the confirmation is recorded and audited.

create table public.site_imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null check (char_length(url) between 8 and 2048 and url ~* '^https?://'),
  status text not null default 'pending' check (status in ('pending', 'fetched', 'failed')),
  ownership_confirmed boolean not null check (ownership_confirmed),
  confirmed_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_imports_project_idx on public.site_imports(project_id, created_at desc);

create trigger site_imports_org before insert or update of project_id on public.site_imports
  for each row execute function public._inherit_org_from_project();
create trigger site_imports_touch before update on public.site_imports
  for each row execute function public._touch_updated_at();

create or replace function public._audit_site_import() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public._audit(new.org_id, 'import.requested', 'site_import', new.id::text,
    jsonb_build_object('url', new.url, 'ownership_confirmed', new.ownership_confirmed, 'project', new.project_id),
    new.confirmed_by);
  return new;
end $$;
create trigger site_imports_audit after insert on public.site_imports
  for each row execute function public._audit_site_import();

alter table public.site_imports enable row level security;
create policy site_imports_select on public.site_imports for select to authenticated
  using (public.has_permission(org_id, 'project.read'));
create policy site_imports_insert on public.site_imports for insert to authenticated
  with check (
    public.has_permission(org_id, 'project.write')
    and ownership_confirmed and confirmed_by = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.projects p where p.id = project_id and p.status <> 'archived')
  );

revoke all on public.site_imports from anon, authenticated;
grant select on public.site_imports to authenticated;
grant insert (project_id, url, ownership_confirmed, confirmed_by) on public.site_imports to authenticated;

select keelwork.finish_migration('20261107000400_phase4_imports');
