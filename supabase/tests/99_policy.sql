-- Policy events: written by the server only; members read their org's; the
-- person or an owner/admin appeals once with a reason; platform staff decide.
select kwtest.file(:'kwfile');

select kwtest.mk_user('pol.owner@example.com');
select kwtest.mk_user('pol.member@example.com');
select kwtest.mk_user('pol.outsider@example.com');
select kwtest.mk_user('pol.staff@example.com');
insert into public.platform_admins(user_id, role) values (kwtest.uuid('user:pol.staff@example.com'), 'reviewer');
select kwtest.login('pol.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Policy Org')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'pol.member@example.com', 'member'));
select kwtest.login('pol.member@example.com'); select public.accept_invitation(kwtest.get('tm'));

reset role;
insert into public.policy_events(id, org_id, user_id, source, level, rules, categories, summary, excerpt, text_hash)
values ('5b0c0b5e-0000-4000-8000-000000000001', kwtest.uuid('org'), kwtest.uuid('user:pol.member@example.com'), 'project_create', 4, '{phishing}', '{C}',
        'Keelwork can''t build phishing pages.', 'A fake bank login page', repeat('a', 64));
select kwtest.set('ev', '5b0c0b5e-0000-4000-8000-000000000001');

-- Reading
select kwtest.login('pol.member@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.policy_events where id = kwtest.uuid('ev'))::int, 1, 'members see their organization''s policy decisions');
select kwtest.throws(format('insert into public.policy_events(org_id, source, level, summary, excerpt, text_hash) values (%L, ''chat'', 2, ''x'', ''x'', %L)', kwtest.get('org'), repeat('b', 64)), 'permission denied', 'people can''t write policy records');
select kwtest.throws(format('update public.policy_events set status = ''overturned'' where id = %L', kwtest.get('ev')), 'permission denied', 'people can''t change a decision directly');
select kwtest.login('pol.outsider@example.com');
select kwtest.eq((select count(*) from public.policy_events where id = kwtest.uuid('ev'))::int, 0, 'other organizations can''t see them');

-- Appeal
select kwtest.throws(format('select public.appeal_policy_event(%L, ''This is a real bank of mine'')', kwtest.get('ev')), 'only the person concerned', 'outsiders can''t appeal');
select kwtest.login('pol.member@example.com');
select kwtest.throws(format('select public.appeal_policy_event(%L, ''short'')', kwtest.get('ev')), 'at least 10 characters', 'an appeal needs a reason');
select kwtest.lives(format('select public.appeal_policy_event(%L, ''It is phishing-awareness training for our own staff.'')', kwtest.get('ev')), 'the person concerned can ask for a review');
select kwtest.throws(format('select public.appeal_policy_event(%L, ''Again, please review this one.'')', kwtest.get('ev')), 'already been reviewed or appealed', 'one appeal per decision');
select kwtest.throws(format('select public.decide_policy_event(%L, ''overturned'', ''Looks fine'')', kwtest.get('ev')), 'platform admin', 'members can''t decide their own appeal');

-- Decision
select kwtest.login('pol.staff@example.com');
select kwtest.eq((select count(*) from public.policy_events where id = kwtest.uuid('ev') and status = 'appealed')::int, 1, 'staff see appealed decisions');
select kwtest.throws(format('select public.decide_policy_event(%L, ''maybe'', ''Hmm'')', kwtest.get('ev')), 'upheld or overturned', 'decisions are upheld or overturned');
select kwtest.lives(format('select public.decide_policy_event(%L, ''overturned'', ''Internal training with your own branding is fine.'')', kwtest.get('ev')), 'staff overturn a decision with a note');
select kwtest.eq((select status from public.policy_events where id = kwtest.uuid('ev')), 'overturned', 'the decision is recorded');
reset role;
select kwtest.ok(exists (select 1 from public.audit_events where action = 'policy.overturned' and target_id = kwtest.get('ev')), 'appeals and decisions are audited');
