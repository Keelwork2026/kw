-- Website drafts made with the content engine. A draft is the full site as
-- JSON (pages, sections, SEO, profile). Every save bumps the version and
-- keeps the previous one, so changes can be undone across sessions. A draft
-- can be shared read-only through an unguessable link, which the owner can
-- turn off at any time.

create table public.site_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  site jsonb not null check (jsonb_typeof(site) = 'object' and octet_length(site::text) < 1000000),
  version integer not null default 1,
  share_token text unique check (share_token is null or char_length(share_token) >= 32),
  shared_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_drafts_org on public.site_drafts (org_id, updated_at desc);

create table public.site_draft_versions (
  id bigint generated always as identity primary key,
  draft_id uuid not null references public.site_drafts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null,
  site jsonb not null,
  saved_by uuid references auth.users(id) on delete set null,
  saved_at timestamptz not null default now(),
  unique (draft_id, version)
);

-- Keep the previous version on every content change; keep the latest 50.
create or replace function public._site_draft_versioning() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.site is distinct from old.site then
    insert into public.site_draft_versions (draft_id, org_id, version, site, saved_by)
      values (old.id, old.org_id, old.version, old.site, auth.uid())
      on conflict (draft_id, version) do nothing;
    new.version := old.version + 1;
    delete from public.site_draft_versions
      where draft_id = old.id and version <= old.version - 50;
  end if;
  new.updated_at := now();
  new.org_id := old.org_id;           -- a draft never moves between organizations
  new.created_by := old.created_by;
  if coalesce(current_setting('kw.site_share', true), '') <> 'on' then
    new.share_token := old.share_token; -- sharing changes only through site_draft_share
    new.shared_at := old.shared_at;
  end if;
  return new;
end $$;
create trigger site_drafts_versioning before update on public.site_drafts
  for each row execute function public._site_draft_versioning();

alter table public.site_drafts enable row level security;
alter table public.site_draft_versions enable row level security;

create policy site_drafts_select on public.site_drafts for select to authenticated
  using (public.has_permission(org_id, 'project.read'));
create policy site_drafts_insert on public.site_drafts for insert to authenticated
  with check (public.has_permission(org_id, 'project.write') and created_by = auth.uid() and share_token is null);
create policy site_drafts_update on public.site_drafts for update to authenticated
  using (public.has_permission(org_id, 'project.write'))
  with check (public.has_permission(org_id, 'project.write'));
create policy site_drafts_delete on public.site_drafts for delete to authenticated
  using (public.has_permission(org_id, 'project.write'));
create policy site_draft_versions_select on public.site_draft_versions for select to authenticated
  using (public.has_permission(org_id, 'project.read'));

grant select, insert, update, delete on public.site_drafts to authenticated;
grant select on public.site_draft_versions to authenticated;

-- Turn the read-only share link on (new random token) or off. Audited.
create or replace function public.site_draft_share(p_draft uuid, p_on boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare d public.site_drafts; tok text;
begin
  select * into d from public.site_drafts where id = p_draft for update;
  if not found then raise exception 'draft not found'; end if;
  perform public._require(d.org_id, 'project.write');
  tok := case when p_on then encode(extensions.gen_random_bytes(24), 'hex') else null end;
  perform set_config('kw.site_share', 'on', true);
  update public.site_drafts set share_token = tok, shared_at = case when p_on then now() else null end where id = p_draft;
  perform set_config('kw.site_share', '', true);
  perform public._audit(d.org_id, case when p_on then 'site.share_on' else 'site.share_off' end, 'site_draft', p_draft::text, '{}'::jsonb);
  return tok;
end $$;
grant execute on function public.site_draft_share(uuid, boolean) to authenticated;

-- Read of a shared draft by its token, for the server-rendered /s/<token>
-- page only (service role). Clients never call it directly.
create or replace function public.shared_site(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select d.site from public.site_drafts d
  where p_token is not null and char_length(p_token) >= 32 and d.share_token = p_token
$$;
revoke all on function public.shared_site(text) from public, anon, authenticated;
grant execute on function public.shared_site(text) to service_role;

select keelwork.finish_migration('20261120000100_site_drafts');
