-- Staff back office: roles, staff management with a last-superadmin guard,
-- aggregates-only overview, suspension enforced in the database, credit
-- adjustments, abuse reports, announcements, platform switches, audit log.
select kwtest.file(:'kwfile');

select kwtest.mk_user('st.super@example.com');
select kwtest.mk_user('st.security@example.com');
select kwtest.mk_user('st.support@example.com');
select kwtest.mk_user('st.reviewer@example.com');
select kwtest.mk_user('st.owner@example.com');
select kwtest.mk_user('st.member@example.com');
select kwtest.mk_user('st.newhire@example.com');
insert into public.platform_admins(user_id, role) values
  (kwtest.uuid('user:st.super@example.com'), 'superadmin'), (kwtest.uuid('user:st.security@example.com'), 'security'),
  (kwtest.uuid('user:st.support@example.com'), 'support'), (kwtest.uuid('user:st.reviewer@example.com'), 'reviewer');

select kwtest.login('st.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Staff Test Org')::text);
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Shop', null, 'A shop', null)::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'st.member@example.com', 'member'));
select kwtest.login('st.member@example.com'); select public.accept_invitation(kwtest.get('tm'));

-- Roles and gating
select kwtest.login('st.member@example.com');
select kwtest.ok(public.staff_role() is null, 'customers have no staff role');
select kwtest.throws('select public.admin_overview()', 'platform admin', 'customers can''t see the overview');
select kwtest.throws('select * from public.admin_list_staff()', 'platform admin', 'customers can''t list staff');
select kwtest.login('st.reviewer@example.com');
select kwtest.eq(public.staff_role(), 'reviewer', 'staff see their own role');
select kwtest.ok((public.admin_overview() ->> 'users')::int >= 7, 'every staff role sees platform aggregates');
select kwtest.throws(format('select public.admin_org_detail(%L)', kwtest.get('org')), 'platform admin', 'reviewers don''t see organization details');
select kwtest.throws('select * from public.admin_find_users(''example'')', 'platform admin', 'reviewers can''t search people');
select kwtest.login('st.support@example.com');
select kwtest.eq((public.admin_org_detail(kwtest.uuid('org')) ->> 'name'), 'Staff Test Org', 'support sees organization metadata');
select kwtest.eq((public.admin_org_detail(kwtest.uuid('org')) -> 'owners' ->> 0), 'st.owner@example.com', 'and who owns it');
select kwtest.eq((select count(*) from public.projects where id = kwtest.uuid('proj'))::int, 0, 'but still can''t see inside projects');
select kwtest.throws('select * from public.admin_find_users(''ex'')', 'at least 3', 'people search needs 3 characters');
select kwtest.eq((select count(*) from public.admin_find_users('st.member'))::int, 1, 'support finds people by email');
select kwtest.throws(format('select public.admin_suspend_org(%L, ''Phishing pages reported by a bank'')', kwtest.get('org')), 'platform admin', 'support can''t suspend');
select kwtest.throws('select * from public.admin_audit_log(null, null, null, 10)', 'platform admin', 'support can''t read the staff audit log');

-- Staff management
select kwtest.throws('select public.staff_add(''st.newhire@example.com'', ''support'', null)', 'platform admin', 'only superadmins add staff');
select kwtest.login('st.super@example.com');
select kwtest.throws('select public.staff_add(''nobody@example.com'', ''support'', null)', 'no Keelwork account', 'staff must have an account');
select kwtest.lives('select public.staff_add(''st.newhire@example.com'', ''support'', ''Weekend cover'')', 'superadmins add staff');
select kwtest.throws('select public.staff_add(''st.newhire@example.com'', ''support'', null)', 'already on staff', 'no duplicates');
select kwtest.lives(format('select public.staff_set_role(%L, ''security'')', kwtest.get('user:st.newhire@example.com')), 'superadmins change roles');
select kwtest.eq((select role from public.admin_list_staff() where email = 'st.newhire@example.com'), 'security', 'the new role shows in the staff list');
select kwtest.throws(format('select public.staff_set_role(%L, ''support'')', kwtest.get('user:st.super@example.com')), 'at least one superadmin', 'the last superadmin can''t be demoted');
select kwtest.throws(format('select public.staff_remove(%L)', kwtest.get('user:st.super@example.com')), 'at least one superadmin', 'or removed');
select kwtest.lives(format('select public.staff_remove(%L)', kwtest.get('user:st.newhire@example.com')), 'superadmins remove staff');
select kwtest.eq((select count(*) from public.admin_list_staff() where email = 'st.newhire@example.com')::int, 0, 'removed staff are gone');

-- Suspension
select kwtest.login('st.security@example.com');
select kwtest.throws(format('select public.admin_suspend_org(%L, ''bad'')', kwtest.get('org')), 'at least 10', 'suspension needs a reason');
reset role;
insert into public.agent_runs(project_id) values (kwtest.uuid('proj'));
select kwtest.login('st.security@example.com');
set role authenticated;
select kwtest.lives(format('select public.admin_suspend_org(%L, ''Phishing pages reported by a bank'')', kwtest.get('org')), 'security staff suspend an organization');
reset role;
select kwtest.eq((select status::text from public.agent_runs where project_id = kwtest.uuid('proj')), 'cancelled', 'queued builds are cancelled');
select kwtest.throws(format('insert into public.agent_runs(project_id) values (%L)', kwtest.get('proj')), 'suspended', 'no new builds, even from services');
select kwtest.ok(exists (select 1 from public.audit_events where org_id = kwtest.uuid('org') and action = 'org.suspended'), 'the organization''s own audit log records it');
select kwtest.login('st.owner@example.com');
set role authenticated;
select kwtest.ok(public.has_permission(kwtest.uuid('org'), 'project.read'), 'people in a suspended organization can still read');
select kwtest.ok(public.has_permission(kwtest.uuid('org'), 'billing.manage'), 'and sort out billing');
select kwtest.ok(not public.has_permission(kwtest.uuid('org'), 'project.write'), 'but can''t change anything');
select kwtest.throws(format('select public.create_project(%L, ''Another'', null, null, null)', kwtest.get('org')), 'permission', 'creating projects is refused');
select kwtest.login('st.security@example.com');
select kwtest.lives(format('select public.admin_unsuspend_org(%L, ''Bank confirmed false report'')', kwtest.get('org')), 'security staff lift a suspension');
select kwtest.login('st.owner@example.com');
select kwtest.ok(public.has_permission(kwtest.uuid('org'), 'project.write'), 'writing works again');

-- Credits
select kwtest.login('st.security@example.com');
select kwtest.throws(format('select public.admin_adjust_credits(%L, 5000000, ''Goodwill for outage'')', kwtest.get('org')), 'platform admin', 'only superadmins adjust credits');
select kwtest.login('st.super@example.com');
select kwtest.throws(format('select public.admin_adjust_credits(%L, 0, ''Goodwill for outage'')', kwtest.get('org')), 'non-zero', 'adjustments must be non-zero');
select kwtest.throws(format('select public.admin_adjust_credits(%L, 20000000000, ''Goodwill for outage'')', kwtest.get('org')), '10,000', 'and capped');
select kwtest.set('before', ((public.admin_org_detail(kwtest.uuid('org')) ->> 'credit_balance_micros'))::text);
select kwtest.lives(format('select public.admin_adjust_credits(%L, 5000000, ''Goodwill for the 20 Nov outage'')', kwtest.get('org')), 'superadmins add credit');
select kwtest.eq(((public.admin_org_detail(kwtest.uuid('org')) ->> 'credit_balance_micros')::bigint - kwtest.get('before')::bigint)::int, 5000000, 'the balance moves by exactly that amount');

-- People
select kwtest.throws(format('select public.admin_user_action(%L, ''ban'', ''Repeated phishing'')', kwtest.get('user:st.support@example.com')), 'staff accounts can''t be banned', 'staff can''t be banned');
select kwtest.throws(format('select public.admin_user_action(%L, ''ban'', ''Repeated phishing'')', kwtest.get('user:st.super@example.com')), 'staff accounts', 'not even yourself');
select kwtest.lives(format('select public.admin_user_action(%L, ''ban'', ''Repeated phishing reports'')', kwtest.get('user:st.member@example.com')), 'bans are checked and recorded');

-- Abuse reports
reset role;
insert into public.abuse_reports(id, category, url, details) values ('6c0c0b5e-0000-4000-8000-000000000001', 'phishing', 'https://shop.example', 'Login page copies my bank.');
select kwtest.login('st.support@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.abuse_reports)::int, 0, 'support doesn''t see reports');
select kwtest.login('st.security@example.com');
select kwtest.eq((select count(*) from public.abuse_reports)::int, 1, 'security sees reports');
select kwtest.lives(format('select public.admin_link_report(%L, %L)', '6c0c0b5e-0000-4000-8000-000000000001', kwtest.get('org')), 'reports can be linked to an organization');
select kwtest.throws(format('select public.admin_update_report(%L, ''actioned'', '''', true)', '6c0c0b5e-0000-4000-8000-000000000001'), 'at least 5', 'closing a report says what was done');
select kwtest.lives(format('select public.admin_update_report(%L, ''actioned'', ''Page removed by owner'', true)', '6c0c0b5e-0000-4000-8000-000000000001'), 'security closes reports');
select kwtest.throws(format('insert into public.abuse_reports(category, details) values (''spam'', %L)', 'Spam spam spam spam'), 'permission denied', 'reports are only written by the server');

-- Announcements and switches
select kwtest.login('st.reviewer@example.com');
select kwtest.throws('select public.admin_publish_announcement(''Maintenance tonight'', ''maintenance'', 4)', 'platform admin', 'reviewers can''t publish announcements');
select kwtest.login('st.support@example.com');
select kwtest.set('ann', public.admin_publish_announcement('Maintenance tonight 22:00 UTC', 'maintenance', 4)::text);
select kwtest.login('st.member@example.com');
select kwtest.eq((select count(*) from public.platform_announcements where id = kwtest.uuid('ann'))::int, 1, 'everyone sees an active announcement');
select kwtest.login('st.support@example.com');
select kwtest.lives(format('select public.admin_end_announcement(%L)', kwtest.get('ann')), 'staff end announcements');
select kwtest.login('st.member@example.com');
select kwtest.eq((select count(*) from public.platform_announcements where id = kwtest.uuid('ann'))::int, 0, 'ended announcements disappear');
select kwtest.throws('select public.admin_set_flag(''builds_open'', false, ''Provider outage at Moonshot'')', 'platform admin', 'only superadmins flip switches');
select kwtest.login('st.super@example.com');
select kwtest.throws('select public.admin_set_flag(''builds_open'', false, ''outage'')', 'at least 10', 'switches need a reason');
select kwtest.lives('select public.admin_set_flag(''builds_open'', false, ''Provider outage at Moonshot'')', 'superadmins pause new builds');
reset role;
select kwtest.throws(format('insert into public.agent_runs(project_id) values (%L)', kwtest.get('proj')), 'paused', 'paused builds are refused in the database');
update public.platform_flags set enabled = false where key = 'signups_open';
select kwtest.throws('insert into auth.users(email) values (''late@example.com'')', 'sign-ups are closed', 'closed sign-ups stop new accounts in the database');
update public.platform_flags set enabled = true where key in ('signups_open', 'builds_open');

-- Audit
select kwtest.login('st.security@example.com');
set role authenticated;
select kwtest.ok((select count(*) from public.admin_audit_log('org.', kwtest.uuid('org'), null, 50)) >= 2, 'suspension and its lifting are in the staff audit log');
select kwtest.ok((select count(*) from public.admin_audit_log('staff.', null, null, 50)) >= 3, 'staff changes are in the audit log');
select kwtest.ok((select admin_email from public.admin_audit_log('billing.', null, null, 1)) = 'st.super@example.com', 'entries name the staff member');
reset role;
