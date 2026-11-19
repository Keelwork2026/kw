-- Website drafts: workspace isolation, viewers read-only, versions kept,
-- sharing only through the audited RPC, shared read by token for the server only.
select kwtest.file(:'kwfile');

select kwtest.mk_user('site.owner@example.com');
select kwtest.mk_user('site.viewer@example.com');
select kwtest.mk_user('site.outsider@example.com');
select kwtest.login('site.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Sites Org')::text);
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'site.viewer@example.com', 'viewer'));
select kwtest.login('site.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

select kwtest.login('site.owner@example.com');
insert into public.site_drafts (org_id, name, site) values (kwtest.uuid('org'), 'Bakery', '{"name":"Bakery","pages":[]}');
select kwtest.set('d', (select id::text from public.site_drafts where org_id = kwtest.uuid('org') and name = 'Bakery'));
select kwtest.ok(kwtest.get('d') is not null, 'members create drafts');
update public.site_drafts set site = '{"name":"Bakery","pages":[{"slug":""}]}' where id = kwtest.uuid('d');
select kwtest.eq((select version from public.site_drafts where id = kwtest.uuid('d')), 2, 'a content change bumps the version');
select kwtest.eq((select count(*) from public.site_draft_versions where draft_id = kwtest.uuid('d'))::int, 1, 'the previous version is kept');
update public.site_drafts set share_token = repeat('a', 48) where id = kwtest.uuid('d');
select kwtest.ok((select share_token is null from public.site_drafts where id = kwtest.uuid('d')), 'sharing cannot be switched on by a plain update');
select kwtest.set('tok', public.site_draft_share(kwtest.uuid('d'), true));
select kwtest.ok(length(kwtest.get('tok')) = 48, 'the share RPC creates a long random token');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'site.share_on' and org_id = kwtest.uuid('org')), 'sharing is audited');
select kwtest.throws(format('select public.shared_site(%L)', kwtest.get('tok')), 'permission denied', 'clients cannot read shared sites directly');

select kwtest.login('site.viewer@example.com');
select kwtest.eq((select count(*) from public.site_drafts where org_id = kwtest.uuid('org'))::int, 1, 'viewers can read drafts');
update public.site_drafts set name = 'Hacked' where id = kwtest.uuid('d');
select kwtest.eq((select name from public.site_drafts where id = kwtest.uuid('d')), 'Bakery', 'viewers cannot edit drafts');
select kwtest.throws(format('select public.site_draft_share(%L, false)', kwtest.get('d')), 'permission', 'viewers cannot change sharing');

select kwtest.login('site.outsider@example.com');
select kwtest.eq((select count(*) from public.site_drafts where id = kwtest.uuid('d'))::int, 0, 'other workspaces cannot see drafts');
select kwtest.eq((select count(*) from public.site_draft_versions where draft_id = kwtest.uuid('d'))::int, 0, 'or their versions');

reset role;
set role service_role;
select kwtest.eq((select public.shared_site(kwtest.get('tok'))->>'name'), 'Bakery', 'the server reads a shared draft by token');
select kwtest.ok(public.shared_site('short') is null, 'short tokens never match');
reset role;
