-- Phase 13: production hardening — token-bucket rate limits with hashed
-- keys (no raw IPs), and a readiness probe.

create table public.rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  tokens double precision not null,
  updated_at timestamptz not null default now()
);

-- Service only. Refills since the last call, then takes p_cost tokens.
create or replace function public.take_tokens(p_key text, p_capacity integer, p_refill_per_second double precision, p_cost integer default 1)
returns table (allowed boolean, remaining double precision, retry_after_seconds integer)
language plpgsql security definer set search_path = '' as $$
declare r public.rate_limits; v_tokens double precision; v_now timestamptz := clock_timestamp();
begin
  if p_key !~ '^[0-9a-f]{64}$' then raise exception 'rate-limit keys must be sha256 hashes'; end if;
  if p_capacity < 1 or p_refill_per_second <= 0 or p_cost < 1 then raise exception 'invalid limit'; end if;
  insert into public.rate_limits(key_hash, tokens, updated_at) values (p_key, p_capacity, v_now) on conflict (key_hash) do nothing;
  select * into r from public.rate_limits where key_hash = p_key for update;
  v_tokens := least(p_capacity::double precision, r.tokens + extract(epoch from (v_now - r.updated_at)) * p_refill_per_second);
  if v_tokens >= p_cost then
    update public.rate_limits set tokens = v_tokens - p_cost, updated_at = v_now where key_hash = p_key;
    return query select true, v_tokens - p_cost, 0;
  else
    update public.rate_limits set tokens = v_tokens, updated_at = v_now where key_hash = p_key;
    return query select false, v_tokens, ceil((p_cost - v_tokens) / p_refill_per_second)::integer;
  end if;
end $$;

create or replace function public.cleanup_rate_limits() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.rate_limits where updated_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;

-- Liveness of the database and the applied migrations (no other details).
create or replace function public.readiness() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('db', true, 'migrations', coalesce((select jsonb_agg(version order by version) from keelwork.applied_migrations), '[]'::jsonb))
$$;

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
revoke all on function public.take_tokens(text, integer, double precision, integer) from authenticated;
revoke all on function public.cleanup_rate_limits() from authenticated;
revoke all on function public.readiness() from authenticated;

select keelwork.finish_migration('20261107001300_phase13_hardening');
