-- Phase 2: projects, chat threads, metering, sandboxes.

create type public.project_status as enum ('draft', 'planning', 'building', 'live', 'archived');
create type public.message_role as enum ('user', 'assistant', 'system');
create type public.sandbox_status as enum ('starting', 'running', 'stopped', 'failed');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 2000),
  status public.project_status not null default 'draft',
  template_key text check (template_key is null or template_key ~ '^[a-z0-9-]{1,48}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index projects_org_idx on public.projects(org_id, updated_at desc);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'Build chat',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index threads_project_idx on public.threads(project_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(content) between 1 and 40000),
  author_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages(thread_id, created_at);

create table public.usage_events (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('ai', 'search')),
  route text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_micros bigint not null check (cost_micros >= 0),
  reference text,
  created_at timestamptz not null default now()
);
create index usage_events_org_idx on public.usage_events(org_id, created_at desc);

create table public.sandboxes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  status public.sandbox_status not null default 'starting',
  container text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- org_id is always inherited, never trusted from the client.
-- ---------------------------------------------------------------------
create or replace function public._inherit_org_from_project() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select org_id into new.org_id from public.projects where id = new.project_id;
  if new.org_id is null then raise exception 'project not found'; end if;
  return new;
end $$;

create or replace function public._inherit_org_from_thread() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select org_id into new.org_id from public.threads where id = new.thread_id;
  if new.org_id is null then raise exception 'thread not found'; end if;
  return new;
end $$;

create trigger threads_org before insert or update of project_id on public.threads
  for each row execute function public._inherit_org_from_project();
create trigger sandboxes_org before insert or update of project_id on public.sandboxes
  for each row execute function public._inherit_org_from_project();
create trigger messages_org before insert or update of thread_id on public.messages
  for each row execute function public._inherit_org_from_thread();

create or replace function public._touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger projects_touch before update on public.projects
  for each row execute function public._touch_updated_at();
create trigger sandboxes_touch before update on public.sandboxes
  for each row execute function public._touch_updated_at();

create trigger usage_events_immutable before update or delete on public.usage_events
  for each row execute function public._audit_immutable();
create trigger usage_events_no_truncate before truncate on public.usage_events
  for each statement execute function public._audit_immutable();

-- Clients can only ever write "user" messages as themselves.
create or replace function public._messages_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.role <> 'user' then
      raise exception 'clients may only write user messages' using errcode = 'insufficient_privilege';
    end if;
    if new.author_id is distinct from auth.uid() then
      raise exception 'messages must be authored by the caller' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;
create trigger messages_guard before insert or update on public.messages
  for each row execute function public._messages_guard();

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------
create or replace function public.create_project(
  p_org uuid, p_name text, p_description text default null,
  p_prompt text default null, p_template text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_project uuid; v_thread uuid;
begin
  perform public._require(p_org, 'project.write');
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'project name must be 1-80 characters';
  end if;
  if p_prompt is not null and char_length(p_prompt) > 2000 then
    raise exception 'the idea can be at most 2000 characters';
  end if;
  insert into public.projects(org_id, workspace_id, name, description, template_key, created_by)
  values (p_org, (select id from public.workspaces where org_id = p_org order by created_at limit 1),
          trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_template, auth.uid())
  returning id into v_project;
  insert into public.threads(project_id, org_id, created_by) values (v_project, p_org, auth.uid())
  returning id into v_thread;
  if p_prompt is not null and char_length(trim(p_prompt)) > 0 then
    insert into public.messages(thread_id, org_id, role, content, author_id)
    values (v_thread, p_org, 'user', trim(p_prompt), auth.uid());
  end if;
  perform public._audit(p_org, 'project.created', 'project', v_project::text,
    jsonb_build_object('name', trim(p_name), 'template', p_template));
  return v_project;
end $$;

create or replace function public.archive_project(p_project uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project for update;
  if v_org is null then raise exception 'project not found'; end if;
  perform public._require(v_org, 'project.manage');
  update public.projects set status = 'archived', archived_at = now() where id = p_project;
  perform public._audit(v_org, 'project.archived', 'project', p_project::text, '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.usage_events enable row level security;
alter table public.sandboxes enable row level security;

create policy projects_select on public.projects for select to authenticated
  using (public.has_permission(org_id, 'project.read'));
create policy projects_update on public.projects for update to authenticated
  using (public.has_permission(org_id, 'project.write') and status <> 'archived')
  with check (public.has_permission(org_id, 'project.write') and status <> 'archived');

create policy threads_select on public.threads for select to authenticated
  using (public.has_permission(org_id, 'project.read'));

create policy messages_select on public.messages for select to authenticated
  using (public.has_permission(org_id, 'project.read'));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    role = 'user' and author_id = auth.uid()
    and public.has_permission(org_id, 'project.write')
    and exists (select 1 from public.threads t join public.projects p on p.id = t.project_id
                where t.id = thread_id and p.status <> 'archived')
  );

create policy usage_select on public.usage_events for select to authenticated
  using (public.has_permission(org_id, 'usage.read'));

create policy sandboxes_select on public.sandboxes for select to authenticated
  using (public.has_permission(org_id, 'project.read'));

revoke all on public.projects, public.threads, public.messages, public.usage_events, public.sandboxes from anon, authenticated;
revoke all on sequence public.usage_events_id_seq from anon, authenticated;
grant select on public.projects, public.threads, public.messages, public.usage_events, public.sandboxes to authenticated;
grant update (name, description) on public.projects to authenticated;
grant insert (thread_id, role, content, author_id, metadata) on public.messages to authenticated;

select keelwork.finish_migration('20261107000200_phase2_projects');
