-- Phase 10: ledger immutability and idempotency, automatic usage debits,
-- balance and monthly-limit checks, seat and project limits, Stripe events
-- applied once.
select kwtest.file(:'kwfile');

select kwtest.mk_user('b.owner@example.com');
select kwtest.mk_user('b.billing@example.com');
select kwtest.mk_user('b.member@example.com');
select kwtest.mk_user('b.extra@example.com');
select kwtest.mk_user('b.outsider@example.com');
select kwtest.login('b.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Billing Org')::text);

-- Welcome grant and plan
select kwtest.eq((select plan_key from public.org_billing where org_id = kwtest.uuid('org')), 'free', 'new organizations start on Free');
select kwtest.eq(public.org_balance_micros(kwtest.uuid('org')), 2000000::bigint, 'new organizations get the Free plan''s credits as a welcome grant');
select kwtest.eq((select count(*) from public.credit_ledger where org_id = kwtest.uuid('org') and kind = 'grant')::int, 1, 'the welcome grant is one ledger row');
select kwtest.eq((select (public.billing_summary(kwtest.uuid('org')) ->> 'max_seats')::int), 2, 'the summary reports plan limits');

-- Seat limit (Free: 2)
select kwtest.set('tb', public.create_invitation(kwtest.uuid('org'), 'b.billing@example.com', 'billing'));
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'b.member@example.com', 'member'));
select kwtest.login('b.billing@example.com');
select kwtest.lives(format('select public.accept_invitation(%L)', kwtest.get('tb')), 'the second seat is available');
select kwtest.login('b.member@example.com');
select kwtest.throws(format('select public.accept_invitation(%L)', kwtest.get('tm')), 'seat limit', 'a third active member exceeds the Free seat limit');

-- Project limit (Free: 3)
select kwtest.login('b.owner@example.com');
select public.create_project(kwtest.uuid('org'), 'One');
select public.create_project(kwtest.uuid('org'), 'Two');
select kwtest.set('p3', public.create_project(kwtest.uuid('org'), 'Three')::text);
select kwtest.throws(format('select public.create_project(%L, ''Four'')', kwtest.get('org')), 'project limit', 'a fourth project exceeds the Free project limit');
select public.archive_project(kwtest.uuid('p3'));
select kwtest.lives(format('select public.create_project(%L, ''Four'')', kwtest.get('org')), 'archived projects don''t count towards the limit');

-- Usage debits the ledger automatically
reset role;
insert into public.usage_events(org_id, kind, route, model, input_tokens, output_tokens, cost_micros) values (kwtest.uuid('org'), 'ai', 'plan', 'kimi', 1000, 500, 7000);
select kwtest.eq((select amount_micros from public.credit_ledger where org_id = kwtest.uuid('org') and kind = 'usage'), -7000::bigint, 'every usage event debits the ledger');
select kwtest.eq(public.org_balance_micros(kwtest.uuid('org')), 1993000::bigint, 'the balance is the sum of the ledger');
select kwtest.eq(public.org_month_usage_micros(kwtest.uuid('org')), 7000::bigint, 'this month''s usage is tracked');
select kwtest.ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'org_billing' and column_name like '%balance%'), 'the balance is never stored');

-- Immutability and idempotency
select kwtest.throws('update public.credit_ledger set amount_micros = 999999999', 'append-only', 'ledger rows cannot be changed');
select kwtest.throws('delete from public.credit_ledger', 'append-only', 'ledger rows cannot be deleted');
select kwtest.throws('truncate public.credit_ledger', 'append-only', 'the ledger cannot be truncated');
select kwtest.throws(format('insert into public.credit_ledger(org_id, kind, amount_micros, reference) values (%L, ''grant'', 1, ''welcome'')', kwtest.get('org')), 'duplicate key', 'ledger references are idempotent');
select kwtest.throws(format('insert into public.credit_ledger(org_id, kind, amount_micros, reference) values (%L, ''usage'', 50, ''u-pos'')', kwtest.get('org')), 'check constraint', 'usage can only debit');

-- assert_can_spend
set role service_role;
select kwtest.lives(format('select public.assert_can_spend(%L, 1000000)', kwtest.get('org')), 'spending within the balance is allowed');
select kwtest.throws(format('select public.assert_can_spend(%L, 5000000)', kwtest.get('org')), 'insufficient credits', 'spending beyond the balance is refused');
reset role;
select kwtest.login('b.billing@example.com');
set role authenticated;
select kwtest.lives(format('select public.set_spend_limit(%L, 10000)', kwtest.get('org')), 'billing managers set a monthly limit');
reset role;
set role service_role;
select kwtest.throws(format('select public.assert_can_spend(%L, 5000)', kwtest.get('org')), 'monthly spending limit', 'the monthly limit is enforced');
select kwtest.lives(format('select public.assert_can_spend(%L, 3000)', kwtest.get('org')), 'spending under the limit is allowed');
reset role;
select kwtest.login('b.outsider@example.com');
set role authenticated;
select kwtest.throws(format('select public.assert_can_spend(%L, 1)', kwtest.get('org')), 'permission denied', 'outsiders cannot probe another organization''s balance');
select kwtest.throws(format('select public.org_balance_micros(%L)', kwtest.get('org')), 'permission denied', 'outsiders cannot read the balance');
select kwtest.eq((select count(*) from public.credit_ledger where org_id = kwtest.uuid('org'))::int, 0, 'outsiders cannot read the ledger');
select kwtest.login('b.owner@example.com');
select kwtest.ok((select count(*) from public.credit_ledger where org_id = kwtest.uuid('org')) >= 2, 'owners can read the ledger');
select kwtest.throws(format('select public.set_spend_limit(%L, -1)', kwtest.get('org')), 'negative', 'limits cannot be negative');
select kwtest.throws(format('insert into public.credit_ledger(org_id, kind, amount_micros, reference) values (%L, ''grant'', 999999999, ''free-money'')', kwtest.get('org')), 'permission denied', 'clients cannot grant themselves credits');
select kwtest.throws(format('update public.org_billing set plan_key = ''enterprise'' where org_id = %L', kwtest.get('org')), 'permission denied', 'clients cannot change their plan directly');

-- Stripe events
reset role;
set role service_role;
select kwtest.eq(public.apply_stripe_event('evt_1', 'checkout.session.completed', kwtest.uuid('org'), 'purchase', 10000000, 'cs_test_1'), true, 'a Stripe purchase is applied');
select kwtest.eq(public.apply_stripe_event('evt_1', 'checkout.session.completed', kwtest.uuid('org'), 'purchase', 10000000, 'cs_test_1'), false, 'the same event is applied only once');
select kwtest.eq(public.apply_stripe_event('evt_2', 'checkout.session.completed', kwtest.uuid('org'), 'purchase', 10000000, 'cs_test_1'), true, 'a different event id is recorded');
select kwtest.eq((select count(*) from public.credit_ledger where org_id = kwtest.uuid('org') and kind = 'purchase')::int, 1, 'but the same reference credits only once');
select kwtest.lives(format('select public.apply_stripe_event(''evt_3'', ''customer.subscription.updated'', %L, null, null, null, ''pro'', ''cus_1'', ''sub_1'', ''active'')', kwtest.get('org')), 'subscription events change the plan');
select kwtest.eq((select plan_key from public.org_billing where org_id = kwtest.uuid('org')), 'pro', 'the plan is updated');
reset role;
select kwtest.login('b.member@example.com');
set role authenticated;
select kwtest.lives(format('select public.accept_invitation(%L)', kwtest.get('tm')), 'upgrading raises the seat limit');
select kwtest.throws(format('select public.apply_stripe_event(''evt_9'', ''x'', %L, ''purchase'', 1, ''r'')', kwtest.get('org')), 'permission denied', 'clients cannot apply Stripe events');
select kwtest.eq((select count(*) from public.org_billing where org_id = kwtest.uuid('org'))::int, 0, 'members without usage.read cannot see billing');
reset role;
set role service_role;
select kwtest.ok(public.grant_monthly_credits('2026-11-01') > 0, 'monthly credits are granted');
select kwtest.eq(public.grant_monthly_credits('2026-11-01'), 0, 'monthly credits are granted once per month');
reset role;
set role anon;
select kwtest.eq((select count(*) from public.billing_plans)::int, 4, 'anyone can read the plans for the pricing page');
reset role;
