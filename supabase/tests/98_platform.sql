-- Phase 12: support access request / owner approval / expiry / revocation
-- / read-only scope, admin gating, marketplace review and immutability,
-- template install, analytics aggregates only, salt rotation.
select kwtest.file(:'kwfile');

select kwtest.mk_user('pl.owner@example.com');
select kwtest.mk_user('pl.admin@example.com');
select kwtest.mk_user('pl.staff@example.com');
select kwtest.mk_user('pl.reviewer@example.com');
select kwtest.mk_user('pl.user@example.com');
insert into public.platform_admins(user_id, role) values (kwtest.uuid('user:pl.staff@example.com'), 'support'), (kwtest.uuid('user:pl.reviewer@example.com'), 'reviewer');

select kwtest.login('pl.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Customer Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Private app', null, 'secret plans')::text);
select kwtest.set('ta', public.create_invitation(kwtest.uuid('org'), 'pl.admin@example.com', 'admin'));
select kwtest.login('pl.admin@example.com'); select public.accept_invitation(kwtest.get('ta'));

-- Admin gating
select kwtest.login('pl.user@example.com');
select kwtest.ok(not public.is_platform_admin(), 'ordinary users are not platform admins');
select kwtest.throws('select * from public.admin_list_orgs()', 'platform admin', 'only platform admins can list organizations');
select kwtest.throws(format('select public.request_support_access(%L, ''please let me in'', 2)', kwtest.get('org')), 'platform admin', 'only staff can request support access');
select kwtest.throws(format('insert into public.platform_admins(user_id, role) values (%L, ''superadmin'')', kwtest.get('user:pl.user@example.com')), 'permission denied', 'there is no self-service path to becoming an admin');
select kwtest.login('pl.staff@example.com');
select kwtest.ok(public.is_platform_admin(), 'staff are platform admins');
select kwtest.ok((select count(*) from public.admin_list_orgs() where id = kwtest.uuid('org')) = 1, 'staff see organization metadata');
select kwtest.eq((select count(*) from public.projects where id = kwtest.uuid('proj'))::int, 0, 'without a grant staff cannot see projects');
select kwtest.eq((select count(*) from public.messages m join public.threads t on t.id = m.thread_id where t.project_id = kwtest.uuid('proj'))::int, 0, 'without a grant staff cannot read data');

-- Request and approval
select kwtest.throws(format('select public.request_support_access(%L, ''short'', 2)', kwtest.get('org')), 'at least 10', 'requests need a reason');
select kwtest.throws(format('select public.request_support_access(%L, ''Investigating ticket 4521'', 100)', kwtest.get('org')), '1-72', 'requests are capped at 72 hours');
select kwtest.set('g', public.request_support_access(kwtest.uuid('org'), 'Investigating ticket 4521', 2)::text);
select kwtest.eq((select count(*) from public.projects where id = kwtest.uuid('proj'))::int, 0, 'a pending request grants nothing');
select kwtest.login('pl.admin@example.com');
select kwtest.eq((select count(*) from public.support_access_grants where id = kwtest.uuid('g'))::int, 1, 'admins see support requests');
select kwtest.throws(format('select public.decide_support_access(%L, true)', kwtest.get('g')), 'only an owner', 'admins cannot approve support access');
select kwtest.login('pl.owner@example.com');
select kwtest.throws(format('select public.decide_support_access(%L, true, 73)', kwtest.get('g')), '1-72', 'owners grant 1-72 hours');
select kwtest.lives(format('select public.decide_support_access(%L, true, 2)', kwtest.get('g')), 'an owner approves');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'support.access_approved' and org_id = kwtest.uuid('org')), 'approval is in the customer''s audit log');
select kwtest.throws(format('select public.decide_support_access(%L, false)', kwtest.get('g')), 'already decided', 'a request is decided once');

-- Read-only scope
select kwtest.login('pl.staff@example.com');
select kwtest.eq((select count(*) from public.projects where id = kwtest.uuid('proj'))::int, 1, 'with a grant staff can read the project');
select kwtest.ok(public.has_permission(kwtest.uuid('org'), 'project.read'), 'the grant gives project.read');
select kwtest.ok(not public.has_permission(kwtest.uuid('org'), 'project.write'), 'the grant never gives project.write');
select kwtest.ok(not public.has_permission(kwtest.uuid('org'), 'secret.manage') and not public.has_permission(kwtest.uuid('org'), 'audit.read'), 'the grant gives nothing beyond reading');
select kwtest.throws(format('select public.create_project(%L, ''Sneaky'')', kwtest.get('org')), 'project.write', 'support cannot create projects');
select kwtest.throws(format('insert into public.messages(thread_id, role, content, author_id) values ((select id from public.threads where project_id = %L), ''user'', ''hi'', auth.uid())', kwtest.get('proj')), 'row-level security', 'support cannot write messages');
select kwtest.eq((select count(*) from public.project_secrets where project_id = kwtest.uuid('proj'))::int, 0, 'secrets stay invisible to support');
select kwtest.throws(format('select public.record_export(%L, 1, 1, %L)', kwtest.get('proj'), repeat('a', 64)), 'permission denied', 'support cannot export source code');

-- Expiry and revocation
reset role;
update public.support_access_grants set expires_at = now() - interval '1 second', starts_at = now() - interval '2 hours' where id = kwtest.uuid('g');
select kwtest.login('pl.staff@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.projects where id = kwtest.uuid('proj'))::int, 0, 'the grant ends exactly at expiry');
reset role;
set role service_role;
select kwtest.eq(public.expire_support_grants(), 1, 'expired grants are marked expired');
reset role;
select kwtest.login('pl.staff@example.com');
set role authenticated;
select kwtest.set('g2', public.request_support_access(kwtest.uuid('org'), 'Follow-up on ticket 4521', 4)::text);
select kwtest.login('pl.owner@example.com');
select public.decide_support_access(kwtest.uuid('g2'), true);
select kwtest.lives(format('select public.revoke_support_access(%L)', kwtest.get('g2')), 'owners revoke at any time');
select kwtest.login('pl.staff@example.com');
select kwtest.eq((select count(*) from public.projects where id = kwtest.uuid('proj'))::int, 0, 'revoked grants give nothing');
select kwtest.ok((select count(*) from public.platform_audit_events where org_id = kwtest.uuid('org')) = 0, 'support staff cannot read the staff trail');
reset role;
select kwtest.ok((select count(*) from public.platform_audit_events where org_id = kwtest.uuid('org')) >= 4, 'every step is in the staff trail');
select kwtest.throws('delete from public.platform_audit_events', 'append-only', 'the staff trail is append-only');

-- Marketplace
select kwtest.login('pl.owner@example.com');
set role authenticated;
select kwtest.throws(format('select public.publish_marketplace_item(%L, ''Booking kit'', ''A booking template with passes'', ''saas'', false, ''{}'', ''[]'', ''[]'', 0)', kwtest.get('proj')), 'rights', 'publishers must confirm the rights');
select kwtest.throws(format('select public.publish_marketplace_item(%L, ''Booking kit'', ''A booking template with passes'', ''saas'', true, ''{".env.local":"X=1"}'', ''[]'', ''[]'', 0)', kwtest.get('proj')), 'env files', 'templates cannot contain env files');
select kwtest.set('item', public.publish_marketplace_item(kwtest.uuid('proj'), 'Booking kit', 'A booking template with passes', 'saas', true, '{"app/page.tsx":"export default 1"}', '[{"path":"app/page.tsx"}]', '[]', 0)::text);
select kwtest.set('bad', public.publish_marketplace_item(kwtest.uuid('proj'), 'Leaky kit', 'Has a committed credential', 'saas', true, '{"a.ts":"x"}', '[]', '[{"rule":"aws"}]', 1)::text);
select kwtest.login('pl.user@example.com');
select kwtest.eq((select count(*) from public.marketplace_items where id = kwtest.uuid('item'))::int, 0, 'items waiting for review are not listed');
select kwtest.throws(format('select public.review_marketplace_item(%L, ''approve'')', kwtest.get('item')), 'reviewer', 'only reviewers review');
select kwtest.login('pl.reviewer@example.com');
select kwtest.throws(format('select public.review_marketplace_item(%L, ''approve'')', kwtest.get('bad')), 'blocking findings', 'items with blocking findings cannot be approved');
select kwtest.lives(format('select public.review_marketplace_item(%L, ''approve'', ''Looks good'')', kwtest.get('item')), 'reviewers approve clean items');
reset role;
select kwtest.throws(format('update public.marketplace_versions set files = ''{}'' where item_id = %L', kwtest.get('item')), 'append-only', 'approved versions are immutable');
select kwtest.login('pl.user@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.marketplace_items where id = kwtest.uuid('item'))::int, 1, 'approved items are listed');
select kwtest.throws('select files from public.marketplace_versions', 'permission denied', 'template files are not downloadable by clients');
select kwtest.set('installed', public.install_template(kwtest.uuid('item'), (select org_id from public.org_members where user_id = auth.uid() limit 1), 'My bookings')::text);
select kwtest.ok((select marketplace_version_id is not null from public.projects where id = kwtest.uuid('installed')), 'installing creates a project seeded from the reviewed version');
select kwtest.throws(format('select public.install_template(%L, %L, ''x'')', kwtest.get('bad'), (select org_id from public.org_members where user_id = auth.uid() limit 1)), 'not available', 'unapproved templates cannot be installed');
select kwtest.throws(format('select public.install_template(%L, %L, ''x'')', kwtest.get('item'), kwtest.get('org')), 'project.write', 'you can only install into your own organization');

-- Analytics
select kwtest.login('pl.owner@example.com');
select kwtest.throws(format('select public.enable_analytics(%L, array[''javascript:alert(1)''])', kwtest.get('proj')), 'origins look like', 'analytics origins are validated');
select kwtest.set('sitekey', public.enable_analytics(kwtest.uuid('proj'), array['https://shop.example.com']));
reset role;
insert into public.analytics_events(site_id, org_id, day, path, referrer_host, device, visitor_hash)
select s.id, s.org_id, current_date, p, r, d, h from public.analytics_sites s,
  (values ('/', 'google.com', 'desktop', 'aaaaaaaaaaaaaaaa'), ('/', null, 'mobile', 'bbbbbbbbbbbbbbbb'), ('/shop', 'google.com', 'desktop', 'aaaaaaaaaaaaaaaa')) v(p, r, d, h)
where s.project_id = kwtest.uuid('proj');
select kwtest.login('pl.owner@example.com');
set role authenticated;
select kwtest.eq((public.analytics_summary(kwtest.uuid('proj'), current_date - 7, current_date) ->> 'pageviews')::int, 3, 'the summary counts page views');
select kwtest.eq((public.analytics_summary(kwtest.uuid('proj'), current_date - 7, current_date) ->> 'visitors')::int, 2, 'and distinct visitors');
select kwtest.eq((select pageviews from public.analytics_breakdown(kwtest.uuid('proj'), 'path', current_date - 7, current_date) where key = '/'), 2::bigint, 'breakdowns are aggregates');
select kwtest.throws('select * from public.analytics_events', 'permission denied', 'raw events are not readable');
select kwtest.throws('select * from public.analytics_salts', 'permission denied', 'salts are not readable');
reset role;
set role service_role;
select public.analytics_salt_for(current_date - 5);
select kwtest.ok(public.analytics_salt_for(current_date) is not null, 'a daily salt is created on demand');
select kwtest.eq(public.analytics_salt_for(current_date), public.analytics_salt_for(current_date), 'the salt is stable within a day');
select kwtest.eq((select count(*) from public.analytics_salts where day < current_date - 1)::int, 0, 'salts older than two days are deleted');
reset role;
