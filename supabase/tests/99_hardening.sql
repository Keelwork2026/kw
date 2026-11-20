-- Phase 13: rate limits, readiness, and a final sweep over the whole schema.
select kwtest.file(:'kwfile');

set role service_role;
select kwtest.eq((select bool_and(allowed) from (select (public.take_tokens(repeat('a', 64), 3, 0.001)).allowed from generate_series(1, 3)) t), true, 'a bucket allows up to its capacity');
select kwtest.eq((select allowed from public.take_tokens(repeat('a', 64), 3, 0.001)), false, 'and then refuses');
select kwtest.ok((select retry_after_seconds from public.take_tokens(repeat('a', 64), 3, 0.001)) > 0, 'refusals say when to retry');
select kwtest.throws('select public.take_tokens(''203.0.113.5'', 10, 1)', 'sha256', 'raw IPs and emails are never stored as keys');
select kwtest.ok(public.readiness() ->> 'db' = 'true' and jsonb_array_length(public.readiness() -> 'migrations') = 21, 'readiness reports the database and all 21 migrations');
reset role;
update public.rate_limits set updated_at = now() - interval '2 days' where key_hash = repeat('a', 64);
set role service_role;
select kwtest.eq(public.cleanup_rate_limits(), 1, 'old buckets are pruned');
reset role;

-- Final sweep
select kwtest.eq((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)::int, 0, 'RLS is on for every table');
select kwtest.eq((select count(*) from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'))::int, 0, 'anon can write nothing anywhere');
select kwtest.eq((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'], false))::int, 0, 'every SECURITY DEFINER function pins search_path');
select kwtest.eq((select count(*) from information_schema.column_privileges where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT'
  and column_name in ('ciphertext', 'wrapped_key', 'iv', 'auth_tag', 'token_hash', 'salt', 'files'))::int, 0, 'no client can read ciphertext, token hashes, salts or template files');
select kwtest.eq((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like '\_%'
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')))::int, 0, 'internal helpers are not callable by clients');
select kwtest.eq((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute'))::int, 0, 'anon cannot call any function');
select kwtest.ok((select count(*) from keelwork.applied_migrations) = 21, 'all 21 migrations recorded themselves');
