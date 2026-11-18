-- Phase 4: website import ownership confirmation and audit.
select kwtest.file(:'kwfile');

select kwtest.mk_user('i.owner@example.com');
select kwtest.mk_user('i.viewer@example.com');
select kwtest.mk_user('i.outsider@example.com');
select kwtest.login('i.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Import Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Imported')::text);
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'i.viewer@example.com', 'viewer'));
select kwtest.login('i.viewer@example.com');
select public.accept_invitation(kwtest.get('tv'));

select kwtest.login('i.owner@example.com');
select kwtest.throws(format('insert into public.site_imports(project_id, url, ownership_confirmed, confirmed_by) values (%L, ''https://clay.example'', false, auth.uid())', kwtest.get('proj')), 'violates', 'imports require ownership confirmation');
select kwtest.throws(format('insert into public.site_imports(project_id, url, confirmed_by) values (%L, ''https://clay.example'', auth.uid())', kwtest.get('proj')), 'violates', 'confirmation cannot be omitted');
select kwtest.throws(format('insert into public.site_imports(project_id, url, ownership_confirmed, confirmed_by) values (%L, ''https://clay.example'', true, %L)', kwtest.get('proj'), kwtest.get('user:i.viewer@example.com')), 'row-level security', 'you can only confirm for yourself');
select kwtest.throws(format('insert into public.site_imports(project_id, url, ownership_confirmed, confirmed_by) values (%L, ''ftp://clay.example'', true, auth.uid())', kwtest.get('proj')), 'check constraint', 'only http(s) URLs can be imported');
select kwtest.lives(format('insert into public.site_imports(project_id, url, ownership_confirmed, confirmed_by) values (%L, ''https://clay.example'', true, auth.uid())', kwtest.get('proj')), 'a confirmed import is recorded');
select kwtest.ok((select org_id from public.site_imports where project_id = kwtest.uuid('proj')) = kwtest.uuid('org'), 'imports inherit org_id');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'import.requested' and org_id = kwtest.uuid('org') and (metadata ->> 'ownership_confirmed')::boolean), 'the confirmation is audited');
select kwtest.throws('update public.site_imports set status = ''fetched''', 'permission denied', 'clients cannot change import results');

select kwtest.login('i.viewer@example.com');
select kwtest.throws(format('insert into public.site_imports(project_id, url, ownership_confirmed, confirmed_by) values (%L, ''https://clay.example'', true, auth.uid())', kwtest.get('proj')), 'row-level security', 'viewers cannot import');
select kwtest.eq((select count(*) from public.site_imports where project_id = kwtest.uuid('proj'))::int, 1, 'viewers can see imports');
select kwtest.login('i.outsider@example.com');
select kwtest.eq((select count(*) from public.site_imports where project_id = kwtest.uuid('proj'))::int, 0, 'outsiders cannot see imports');
reset role;
