-- Test-only shim that reproduces the parts of a Supabase database the
-- migrations rely on: the auth schema, auth.uid()/auth.jwt(), the anon,
-- authenticated and service_role roles, the extensions schema, and
-- Supabase's default privileges (every new public table and function is
-- granted to anon and authenticated, so RLS and explicit revokes must do
-- the protecting). Never applied to a real Supabase project.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', current_user::text)
$$;

grant execute on all functions in schema auth to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- kwtest: the assertion harness used by every supabase/tests file.
-- Each kwtest.* call is one check. Results are stored; a false result is
-- recorded (not raised) so one failure can't hide another.
-- ---------------------------------------------------------------------
create schema if not exists kwtest;
grant usage on schema kwtest to anon, authenticated, service_role;

create table if not exists kwtest.results (
  id serial primary key,
  file text not null,
  name text not null,
  ok boolean not null,
  detail text
);
grant insert, select on kwtest.results to anon, authenticated, service_role;
grant usage on sequence kwtest.results_id_seq to anon, authenticated, service_role;

create table if not exists kwtest.vars (k text primary key, v text);
grant all on kwtest.vars to anon, authenticated, service_role;

create or replace function kwtest.file(p text) returns void language sql as $$
  select set_config('kwtest.file', p, false); select null::void;
$$;

create or replace function kwtest.record(p_ok boolean, p_name text, p_detail text default null)
returns boolean language plpgsql as $$
begin
  insert into kwtest.results(file, name, ok, detail)
  values (coalesce(current_setting('kwtest.file', true), '?'), p_name, coalesce(p_ok, false), p_detail);
  if not coalesce(p_ok, false) then
    raise warning 'CHECK FAILED: % %', p_name, coalesce(p_detail, '');
  end if;
  return coalesce(p_ok, false);
end $$;

create or replace function kwtest.ok(p_cond boolean, p_name text) returns boolean
language sql as $$ select kwtest.record(p_cond, p_name, case when p_cond is null then 'condition was null' end) $$;

create or replace function kwtest.eq(p_got anyelement, p_want anyelement, p_name text) returns boolean
language sql as $$
  select kwtest.record(p_got is not distinct from p_want, p_name,
    format('got %s, want %s', p_got, p_want))
$$;

-- Runs p_sql as the current role; passes when it raises an error whose
-- message contains p_pattern (case-insensitive).
create or replace function kwtest.throws(p_sql text, p_pattern text, p_name text) returns boolean
language plpgsql as $$
declare msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics msg = message_text;
    return kwtest.record(msg ilike '%' || p_pattern || '%', p_name, 'raised: ' || msg);
  end;
  return kwtest.record(false, p_name, 'no error raised');
end $$;

-- Passes when p_sql runs without error.
create or replace function kwtest.lives(p_sql text, p_name text) returns boolean
language plpgsql as $$
declare msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics msg = message_text;
    return kwtest.record(false, p_name, 'raised: ' || msg);
  end;
  return kwtest.record(true, p_name);
end $$;

-- Runs a query returning one value, as the current role.
create or replace function kwtest.val(p_sql text) returns text
language plpgsql as $$
declare r text;
begin
  execute p_sql into r;
  return r;
end $$;

create or replace function kwtest.set(p_k text, p_v text) returns text
language sql as $$
  insert into kwtest.vars(k, v) values (p_k, p_v)
  on conflict (k) do update set v = excluded.v
  returning v
$$;

create or replace function kwtest.get(p_k text) returns text
language sql stable as $$ select v from kwtest.vars where k = p_k $$;

create or replace function kwtest.uuid(p_k text) returns uuid
language sql stable as $$ select v::uuid from kwtest.vars where k = p_k $$;

-- Creates an auth user (fires handle_new_user) and stores its id as
-- kwtest var 'user:<email>'.
create or replace function kwtest.mk_user(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  insert into auth.users(email, raw_user_meta_data)
  values (p_email, jsonb_build_object('display_name', split_part(p_email, '@', 1)))
  returning id into uid;
  perform kwtest.set('user:' || p_email, uid::text);
  return uid;
end $$;

-- Sets the JWT claims for a user. Follow with `set role authenticated;`.
create or replace function kwtest.login(p_email text, p_aal text default 'aal1') returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = p_email;
  if uid is null then raise exception 'kwtest: no user %', p_email; end if;
  perform set_config('request.jwt.claim.sub', uid::text, false);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated', 'email', p_email, 'aal', p_aal)::text, false);
end $$;

create or replace function kwtest.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claims', '', false);
end $$;

grant execute on all functions in schema kwtest to anon, authenticated, service_role;
