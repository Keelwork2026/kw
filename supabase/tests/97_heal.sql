-- Phase 11: incidents opened, de-duplicated and resolved by triggers;
-- fix requests and dismissals.
select kwtest.file(:'kwfile');

select kwtest.mk_user('h.owner@example.com');
select kwtest.mk_user('h.viewer@example.com');
select kwtest.login('h.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Heal Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Heal')::text);
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'h.viewer@example.com', 'viewer'));
select kwtest.login('h.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

reset role;
-- A failing check opens an incident; repeats are grouped by signature.
insert into public.check_runs(project_id, org_id, kind, status) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'tests', 'running');
update public.check_runs set status = 'failed', exit_code = 1, output = 'FAIL tests/booking.test.ts' where project_id = kwtest.uuid('proj') and kind = 'tests' and status = 'running';
select kwtest.eq((select count(*) from public.incidents where project_id = kwtest.uuid('proj') and status = 'open')::int, 1, 'a failed check opens an incident');
insert into public.check_runs(project_id, org_id, kind, status) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'tests', 'running');
update public.check_runs set status = 'failed', exit_code = 1 where project_id = kwtest.uuid('proj') and kind = 'tests' and status = 'running';
select kwtest.eq((select count from public.incidents where project_id = kwtest.uuid('proj') and signature = 'check:tests'), 2, 'repeats are grouped with a counter');
-- A selective pass never closes it; a full pass does.
insert into public.check_runs(project_id, org_id, kind, status) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'affected_tests', 'running');
update public.check_runs set status = 'passed', exit_code = 0 where project_id = kwtest.uuid('proj') and kind = 'affected_tests' and status = 'running';
select kwtest.eq((select status from public.incidents where project_id = kwtest.uuid('proj') and signature = 'check:tests'), 'open', 'a selective test pass never closes an incident');
insert into public.check_runs(project_id, org_id, kind, status) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'tests', 'running');
update public.check_runs set status = 'passed', exit_code = 0 where project_id = kwtest.uuid('proj') and kind = 'tests' and status = 'running';
select kwtest.eq((select status from public.incidents where project_id = kwtest.uuid('proj') and signature = 'check:tests'), 'resolved', 'the same check passing resolves the incident');

-- Deployments and workflows
insert into public.deployments(project_id, org_id, environment) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'production');
update public.deployments set status = 'failed', error = 'live check failed' where project_id = kwtest.uuid('proj');
select kwtest.ok(exists (select 1 from public.incidents where signature = 'deploy:production' and status = 'open' and project_id = kwtest.uuid('proj')), 'a failed deployment opens an incident');
with w as (insert into public.workflows(project_id, org_id, name, trigger_kind, definition) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'Digest', 'manual', '{"steps":[{"id":"a"}]}') returning id)
select kwtest.set('wf', id::text) from w;
insert into public.workflow_runs(workflow_id, project_id, org_id, trigger_kind, definition, workflow_version, status) values (kwtest.uuid('wf'), kwtest.uuid('proj'), kwtest.uuid('org'), 'manual', '{"steps":[]}', 1, 'running');
update public.workflow_runs set status = 'failed', error = 'Slack answered 404' where workflow_id = kwtest.uuid('wf');
select kwtest.ok(exists (select 1 from public.incidents where signature = 'workflow:' || kwtest.get('wf') and status = 'open'), 'a failed automation opens an incident');
insert into public.workflow_runs(workflow_id, project_id, org_id, trigger_kind, definition, workflow_version, status) values (kwtest.uuid('wf'), kwtest.uuid('proj'), kwtest.uuid('org'), 'manual', '{"steps":[]}', 1, 'running');
update public.workflow_runs set status = 'succeeded' where workflow_id = kwtest.uuid('wf') and status = 'running';
select kwtest.eq((select status from public.incidents where signature = 'workflow:' || kwtest.get('wf')), 'resolved', 'a later success resolves it');

-- Fix requests and dismissals
select kwtest.set('inc', (select id from public.incidents where signature = 'deploy:production' and project_id = kwtest.uuid('proj'))::text);
select kwtest.login('h.viewer@example.com');
set role authenticated;
select kwtest.throws(format('select public.request_fix(%L, %L)', kwtest.get('inc'), repeat('x', 30)), 'project.write', 'viewers cannot request fixes');
select kwtest.login('h.owner@example.com');
select kwtest.throws(format('select public.request_fix(%L, ''fix'')', kwtest.get('inc')), 'empty or too long', 'repair requests need content');
select kwtest.lives(format('select public.request_fix(%L, %L)', kwtest.get('inc'), 'Repair request: the production deployment failed its live check.'), 'owners request a fix');
select kwtest.eq((select status from public.incidents where id = kwtest.uuid('inc')), 'fix_proposed', 'the incident becomes fix_proposed');
select kwtest.ok(exists (select 1 from public.messages where (metadata ->> 'incident') = kwtest.get('inc')), 'the repair request is posted to the thread');
select kwtest.throws(format('select public.dismiss_incident(%L, ''no'')', kwtest.get('inc')), 'say why', 'dismissing needs a reason');
select kwtest.lives(format('select public.dismiss_incident(%L, ''Known provider outage'')', kwtest.get('inc')), 'incidents can be dismissed with a reason');
select kwtest.throws(format('update public.incidents set status = ''open'' where id = %L', kwtest.get('inc')), 'permission denied', 'clients cannot edit incidents');
reset role;
