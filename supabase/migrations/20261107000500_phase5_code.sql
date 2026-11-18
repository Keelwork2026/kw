-- Phase 5: hand edits in the Code view. A person's edit is refused while
-- an agent holds the file's lock or the project is archived, and the edit
-- history is immutable once an edit finishes.

create table public.code_edits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 300),
  base_sha256 text check (base_sha256 is null or base_sha256 ~ '^[0-9a-f]{64}$'),
  is_migration boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'saved', 'conflict', 'failed')),
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,64}$'),
  error text,
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index code_edits_project_idx on public.code_edits(project_id, created_at desc);

create trigger code_edits_org before insert on public.code_edits
  for each row execute function public._inherit_org_from_project();

create or replace function public._code_edits_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'code edit history is immutable' using errcode = 'insufficient_privilege';
  end if;
  if old.status <> 'pending' then
    raise exception 'code edit history is immutable' using errcode = 'insufficient_privilege';
  end if;
  if new.id <> old.id or new.project_id <> old.project_id or new.path <> old.path or new.author_id <> old.author_id
     or new.base_sha256 is distinct from old.base_sha256 or new.created_at <> old.created_at then
    raise exception 'only the outcome of a code edit can be recorded';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger code_edits_guard before update or delete on public.code_edits
  for each row execute function public._code_edits_guard();
create trigger code_edits_no_truncate before truncate on public.code_edits
  for each statement execute function public._audit_immutable();

create or replace function public.begin_code_edit(p_project uuid, p_path text, p_base_sha256 text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare pr public.projects; v_id uuid; v_mig boolean;
begin
  select * into pr from public.projects where id = p_project;
  if not found then raise exception 'project not found'; end if;
  perform public._require(pr.org_id, 'project.write');
  if pr.status = 'archived' then raise exception 'project is archived and read-only'; end if;
  if p_path is null or char_length(p_path) not between 1 and 300 or p_path ~ '(^/|\\|(^|/)\.\.?(/|$)|//|(^|/)\.git(/|$))'
     or p_path ~ '(^|/)\.env' and p_path !~ '(^|/)\.env\.example$' then
    raise exception 'that path cannot be edited';
  end if;
  if exists (
    select 1 from public.file_locks l join public.agent_runs r on r.id = l.run_id
    where l.project_id = p_project and l.path = p_path
      and r.status in ('queued', 'running', 'waiting_approval')
      and l.heartbeat_at > now() - interval '10 minutes'
  ) then
    raise exception 'an agent is editing this file right now; try again when it finishes or pause the build';
  end if;
  v_mig := p_path ~ '^(supabase/migrations|db/migrations)/';
  insert into public.code_edits(project_id, org_id, path, base_sha256, is_migration, author_id)
  values (p_project, pr.org_id, p_path, p_base_sha256, v_mig, auth.uid()) returning id into v_id;
  perform public._audit(pr.org_id, 'code.edit_started', 'project', p_project::text,
    jsonb_build_object('path', p_path, 'edit', v_id, 'migration', v_mig));
  return v_id;
end $$;

create or replace function public.finish_code_edit(p_edit uuid, p_status text, p_commit_sha text default null, p_error text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare e public.code_edits;
begin
  select * into e from public.code_edits where id = p_edit for update;
  if not found then raise exception 'edit not found'; end if;
  if e.author_id <> auth.uid() then raise exception 'only the author can finish an edit' using errcode = 'insufficient_privilege'; end if;
  if p_status not in ('saved', 'conflict', 'failed') then raise exception 'invalid status'; end if;
  if p_status = 'saved' and p_commit_sha is null then raise exception 'a saved edit needs its commit'; end if;
  update public.code_edits set status = p_status, commit_sha = p_commit_sha, error = left(p_error, 500) where id = e.id;
  perform public._audit(e.org_id, 'code.edit_' || p_status, 'project', e.project_id::text,
    jsonb_build_object('path', e.path, 'edit', e.id, 'commit', p_commit_sha));
end $$;

alter table public.code_edits enable row level security;
create policy code_edits_select on public.code_edits for select to authenticated
  using (public.has_permission(org_id, 'project.read'));
revoke all on public.code_edits from anon, authenticated;
grant select on public.code_edits to authenticated;

select keelwork.finish_migration('20261107000500_phase5_code');
