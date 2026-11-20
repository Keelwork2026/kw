-- Simple Mode feedback: "Did this page make sense?" from the guide.
-- Written only by the server (service role, rate limited); read by staff.
create table public.simple_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_key text not null check (char_length(page_key) between 1 and 80),
  helpful boolean not null,
  note text check (note is null or char_length(note) <= 500),
  user_id uuid references auth.users(id) on delete set null
);
create index simple_feedback_page_idx on public.simple_feedback(page_key, created_at desc);

alter table public.simple_feedback enable row level security;
revoke all on public.simple_feedback from anon, authenticated;
grant select on public.simple_feedback to authenticated;
create policy simple_feedback_staff on public.simple_feedback for select to authenticated
  using (public.is_platform_admin(array['support', 'reviewer', 'security', 'superadmin']));

select keelwork.finish_migration('20261124000100_simple_feedback');
