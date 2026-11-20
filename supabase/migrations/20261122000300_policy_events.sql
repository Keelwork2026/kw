-- Policy enforcement records and appeals (Prohibited Project & AI Generation Policy).
--  * A row is written when Keelwork refuses a project (level 4) or declines a
--    feature (level 3): what was matched, a short excerpt, and a hash of the text.
--  * The person (or an owner/admin) can ask for a review; platform staff
--    uphold or overturn it. An overturned decision lets that exact request
--    through for the organization from then on.
--  * Rows are written by the server (service role); people can read their
--    organization's rows and appeal, nothing else.

create table public.policy_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('project_create', 'chat', 'site', 'agent')),
  level smallint not null check (level between 2 and 5),
  rules text[] not null default '{}',
  categories text[] not null default '{}',
  summary text not null check (char_length(summary) <= 1000),
  excerpt text not null check (char_length(excerpt) <= 300),
  text_hash text not null check (text_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'recorded' check (status in ('recorded', 'appealed', 'upheld', 'overturned')),
  appeal_note text check (appeal_note is null or char_length(appeal_note) <= 1000),
  appealed_by uuid references auth.users(id) on delete set null,
  appealed_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  created_at timestamptz not null default now()
);
create index policy_events_org_idx on public.policy_events(org_id, created_at desc);
create index policy_events_appealed_idx on public.policy_events(status) where status = 'appealed';
create index policy_events_hash_idx on public.policy_events(org_id, text_hash) where status = 'overturned';

alter table public.policy_events enable row level security;
revoke all on public.policy_events from anon, authenticated;
grant select on public.policy_events to authenticated;
create policy policy_events_select on public.policy_events for select to authenticated
  using (public.has_permission(org_id, 'project.read') or public.is_platform_admin());

-- Ask for a review: the person it happened to, or an owner/admin of the organization.
create or replace function public.appeal_policy_event(p_event uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.policy_events;
begin
  select * into e from public.policy_events where id = p_event for update;
  if not found then raise exception 'not found'; end if;
  if e.user_id is distinct from auth.uid() and not public.has_permission(e.org_id, 'org.manage') then
    raise exception 'only the person concerned or an owner/admin can ask for a review' using errcode = 'insufficient_privilege';
  end if;
  if e.status <> 'recorded' then raise exception 'this decision has already been reviewed or appealed'; end if;
  if p_note is null or char_length(trim(p_note)) < 10 then raise exception 'explain what the project is for (at least 10 characters)'; end if;
  update public.policy_events set status = 'appealed', appeal_note = left(trim(p_note), 1000), appealed_by = auth.uid(), appealed_at = now() where id = e.id;
  perform public._audit(e.org_id, 'policy.appealed', 'policy_event', e.id::text, jsonb_build_object('rules', e.rules));
end $$;

-- Platform staff decide appeals.
create or replace function public.decide_policy_event(p_event uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.policy_events;
begin
  if not public.is_platform_admin() then raise exception 'platform staff only' using errcode = 'insufficient_privilege'; end if;
  if p_decision not in ('upheld', 'overturned') then raise exception 'decision must be upheld or overturned'; end if;
  select * into e from public.policy_events where id = p_event for update;
  if not found then raise exception 'not found'; end if;
  if e.status <> 'appealed' then raise exception 'only appealed decisions can be reviewed'; end if;
  if p_note is null or char_length(trim(p_note)) < 5 then raise exception 'add a short note for the person'; end if;
  update public.policy_events set status = p_decision, decided_by = auth.uid(), decided_at = now(), decision_note = left(trim(p_note), 1000) where id = e.id;
  perform public._audit(e.org_id, 'policy.' || p_decision, 'policy_event', e.id::text, jsonb_build_object('rules', e.rules));
end $$;

revoke all on function public.appeal_policy_event(uuid, text) from public, anon;
revoke all on function public.decide_policy_event(uuid, text, text) from public, anon;
grant execute on function public.appeal_policy_event(uuid, text) to authenticated;
grant execute on function public.decide_policy_event(uuid, text, text) to authenticated;

select keelwork.finish_migration('20261122000300_policy_events');
