-- Phase 10: billing — plans, an append-only credit ledger (the balance is
-- the sum of the ledger, never stored), automatic usage debits, spend
-- limits, seat and project limits, Stripe events applied once.

create table public.billing_plans (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name text not null,
  max_seats integer check (max_seats is null or max_seats > 0),
  max_projects integer check (max_projects is null or max_projects > 0),
  monthly_credits_micros bigint not null check (monthly_credits_micros >= 0),
  stripe_price_env text check (stripe_price_env is null or stripe_price_env ~ '^STRIPE_PRICE_[A-Z0-9_]+$'),
  sort integer not null default 0
);
-- Starting values; change before launch.
insert into public.billing_plans(key, name, max_seats, max_projects, monthly_credits_micros, stripe_price_env, sort) values
  ('free', 'Free', 2, 3, 2000000, null, 1),
  ('pro', 'Pro', 5, 20, 20000000, 'STRIPE_PRICE_PRO', 2),
  ('business', 'Business', 50, 200, 100000000, 'STRIPE_PRICE_BUSINESS', 3),
  ('enterprise', 'Enterprise', null, null, 0, null, 4);

create table public.org_billing (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  plan_key text not null default 'free' references public.billing_plans(key),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  spend_limit_micros bigint check (spend_limit_micros is null or spend_limit_micros >= 0),
  updated_at timestamptz not null default now()
);
create trigger org_billing_touch before update on public.org_billing for each row execute function public._touch_updated_at();

create table public.credit_ledger (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('grant', 'purchase', 'usage', 'refund', 'adjustment')),
  amount_micros bigint not null,
  reference text not null check (char_length(reference) between 1 and 200),
  description text,
  created_at timestamptz not null default now(),
  unique (org_id, kind, reference),
  check ((kind = 'usage' and amount_micros <= 0) or (kind in ('grant', 'purchase', 'refund') and amount_micros >= 0) or kind = 'adjustment')
);
create index credit_ledger_org_idx on public.credit_ledger(org_id, created_at desc);
create trigger credit_ledger_immutable before update or delete on public.credit_ledger for each row execute function public._audit_immutable();
create trigger credit_ledger_no_truncate before truncate on public.credit_ledger for each statement execute function public._audit_immutable();

create table public.stripe_events (
  id text primary key check (id ~ '^evt_[A-Za-z0-9]+$'),
  type text not null,
  org_id uuid references public.organizations(id) on delete set null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
create or replace function public._is_service() returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is null
$$;

create or replace function public.org_balance_micros(p_org uuid) returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._is_service() and not public.has_permission(p_org, 'usage.read') and not public.is_org_member(p_org) then
    raise exception 'permission denied: usage.read' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select sum(amount_micros) from public.credit_ledger where org_id = p_org), 0);
end $$;

create or replace function public.org_month_usage_micros(p_org uuid) returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._is_service() and not public.is_org_member(p_org) then
    raise exception 'permission denied' using errcode = 'insufficient_privilege';
  end if;
  return coalesce(-(select sum(amount_micros) from public.credit_ledger
    where org_id = p_org and kind = 'usage' and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'), 0);
end $$;

-- Checked before every AI call or search, for people and agents.
create or replace function public.assert_can_spend(p_org uuid, p_estimate_micros bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_limit bigint; v_balance bigint; v_month bigint;
begin
  if not public._is_service() and not public.is_org_member(p_org) then
    raise exception 'permission denied' using errcode = 'insufficient_privilege';
  end if;
  if p_estimate_micros is null or p_estimate_micros < 0 then raise exception 'invalid estimate'; end if;
  v_balance := public.org_balance_micros(p_org);
  if v_balance - p_estimate_micros < 0 then
    raise exception 'insufficient credits: balance % micros, this needs up to %', v_balance, p_estimate_micros using errcode = 'P0001';
  end if;
  select spend_limit_micros into v_limit from public.org_billing where org_id = p_org;
  if v_limit is not null then
    v_month := public.org_month_usage_micros(p_org);
    if v_month + p_estimate_micros > v_limit then
      raise exception 'monthly spending limit reached: % of % micros used', v_month, v_limit using errcode = 'P0001';
    end if;
  end if;
end $$;

create or replace function public.set_spend_limit(p_org uuid, p_limit_micros bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require(p_org, 'billing.manage');
  if p_limit_micros is not null and p_limit_micros < 0 then raise exception 'the limit cannot be negative'; end if;
  update public.org_billing set spend_limit_micros = p_limit_micros where org_id = p_org;
  perform public._audit(p_org, 'billing.spend_limit_set', 'organization', p_org::text, jsonb_build_object('limit_micros', p_limit_micros));
end $$;

create or replace function public.billing_summary(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare b public.org_billing; p public.billing_plans;
begin
  perform public._require(p_org, 'usage.read');
  select * into b from public.org_billing where org_id = p_org;
  select * into p from public.billing_plans where key = coalesce(b.plan_key, 'free');
  return jsonb_build_object(
    'plan_key', p.key, 'plan_name', p.name,
    'balance_micros', public.org_balance_micros(p_org),
    'month_usage_micros', public.org_month_usage_micros(p_org),
    'spend_limit_micros', b.spend_limit_micros,
    'monthly_credits_micros', p.monthly_credits_micros,
    'seats_used', (select count(*) from public.org_members where org_id = p_org and status = 'active'),
    'max_seats', p.max_seats,
    'projects_used', (select count(*) from public.projects where org_id = p_org and status <> 'archived'),
    'max_projects', p.max_projects,
    'subscription_status', b.subscription_status,
    'current_period_end', b.current_period_end,
    'has_customer', b.stripe_customer_id is not null);
end $$;

-- Service only. Applied once per event id AND once per ledger reference.
-- Credits and organization come only from server-set metadata.
create or replace function public.apply_stripe_event(
  p_event_id text, p_type text, p_org uuid, p_kind text default null, p_amount_micros bigint default null, p_reference text default null,
  p_plan_key text default null, p_customer text default null, p_subscription text default null, p_status text default null, p_period_end timestamptz default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stripe_events(id, type, org_id) values (p_event_id, p_type, p_org) on conflict (id) do nothing;
  if not found then return false; end if;
  if p_org is null or not exists (select 1 from public.organizations where id = p_org) then return true; end if;
  if p_kind is not null then
    if p_kind not in ('purchase', 'grant', 'refund', 'adjustment') or p_reference is null or p_amount_micros is null then raise exception 'invalid ledger entry'; end if;
    insert into public.credit_ledger(org_id, kind, amount_micros, reference, description)
    values (p_org, p_kind, p_amount_micros, p_reference, p_type) on conflict (org_id, kind, reference) do nothing;
  end if;
  if p_plan_key is not null or p_customer is not null or p_status is not null then
    if p_plan_key is not null and not exists (select 1 from public.billing_plans where key = p_plan_key) then raise exception 'unknown plan'; end if;
    update public.org_billing set
      plan_key = coalesce(p_plan_key, plan_key),
      stripe_customer_id = coalesce(p_customer, stripe_customer_id),
      stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
      subscription_status = coalesce(p_status, subscription_status),
      current_period_end = coalesce(p_period_end, current_period_end)
    where org_id = p_org;
  end if;
  perform public._audit(p_org, 'billing.stripe_event', 'organization', p_org::text, jsonb_build_object('event', p_event_id, 'type', p_type, 'kind', p_kind, 'amount_micros', p_amount_micros, 'plan', p_plan_key), null);
  return true;
end $$;

-- Monthly allowance (idempotent per month), run by the automation runner's housekeeping.
create or replace function public.grant_monthly_credits(p_month date default (now() at time zone 'utc')::date) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.credit_ledger(org_id, kind, amount_micros, reference, description)
  select b.org_id, 'grant', p.monthly_credits_micros, 'monthly:' || to_char(p_month, 'YYYY-MM'), p.name || ' monthly credits'
  from public.org_billing b join public.billing_plans p on p.key = b.plan_key
  where p.monthly_credits_micros > 0
  on conflict (org_id, kind, reference) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Every usage event debits the ledger.
create or replace function public._usage_to_ledger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cost_micros > 0 then
    insert into public.credit_ledger(org_id, kind, amount_micros, reference, description)
    values (new.org_id, 'usage', -new.cost_micros, 'usage:' || new.id, coalesce(new.kind || ' ' || new.model, new.kind));
  end if;
  return new;
end $$;
create trigger usage_events_to_ledger after insert on public.usage_events for each row execute function public._usage_to_ledger();

create or replace function public._enforce_seat_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_max integer; v_used integer;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then return new; end if;
  select p.max_seats into v_max from public.org_billing b join public.billing_plans p on p.key = b.plan_key where b.org_id = new.org_id;
  if v_max is null then return new; end if;
  select count(*) into v_used from public.org_members where org_id = new.org_id and status = 'active' and user_id <> new.user_id;
  if v_used >= v_max then raise exception 'seat limit reached: your plan includes % seats', v_max; end if;
  return new;
end $$;
create trigger org_members_seat_limit before insert or update of status on public.org_members for each row execute function public._enforce_seat_limit();

create or replace function public._enforce_project_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_max integer; v_used integer;
begin
  select p.max_projects into v_max from public.org_billing b join public.billing_plans p on p.key = b.plan_key where b.org_id = new.org_id;
  if v_max is null then return new; end if;
  select count(*) into v_used from public.projects where org_id = new.org_id and status <> 'archived';
  if v_used >= v_max then raise exception 'project limit reached: your plan includes % projects', v_max; end if;
  return new;
end $$;
create trigger projects_limit before insert on public.projects for each row execute function public._enforce_project_limit();

create or replace function public._new_org_billing() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.org_billing(org_id, plan_key) values (new.id, 'free') on conflict do nothing;
  insert into public.credit_ledger(org_id, kind, amount_micros, reference, description)
  select new.id, 'grant', monthly_credits_micros, 'welcome', 'Welcome credits' from public.billing_plans where key = 'free'
  on conflict do nothing;
  return new;
end $$;
create trigger organizations_billing after insert on public.organizations for each row execute function public._new_org_billing();

-- Backfill organizations that existed before billing.
insert into public.org_billing(org_id, plan_key) select id, 'free' from public.organizations on conflict do nothing;
insert into public.credit_ledger(org_id, kind, amount_micros, reference, description)
select o.id, 'grant', p.monthly_credits_micros, 'welcome', 'Welcome credits' from public.organizations o, public.billing_plans p where p.key = 'free'
on conflict do nothing;

alter table public.billing_plans enable row level security;
alter table public.org_billing enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.stripe_events enable row level security;
create policy billing_plans_select on public.billing_plans for select to anon, authenticated using (true);
create policy org_billing_select on public.org_billing for select to authenticated using (public.has_permission(org_id, 'usage.read') or public.has_permission(org_id, 'billing.manage'));
create policy credit_ledger_select on public.credit_ledger for select to authenticated using (public.has_permission(org_id, 'usage.read'));

revoke all on public.billing_plans, public.org_billing, public.credit_ledger, public.stripe_events from anon, authenticated;
revoke all on sequence public.credit_ledger_id_seq from anon, authenticated;
grant select on public.billing_plans to anon, authenticated;
grant select on public.org_billing, public.credit_ledger to authenticated;
revoke all on function public.apply_stripe_event(text, text, uuid, text, bigint, text, text, text, text, text, timestamptz) from authenticated;
revoke all on function public.grant_monthly_credits(date) from authenticated;

select keelwork.finish_migration('20261107001000_phase10_billing');
