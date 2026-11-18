-- Phase 7: draft vs switch-on vs run, definition snapshots, leases,
-- runaway runs, immutable step logs, webhook replay.
select kwtest.file(:'kwfile');

select kwtest.mk_user('w.owner@example.com');
select kwtest.mk_user('w.member@example.com');
select kwtest.mk_user('w.viewer@example.com');
select kwtest.login('w.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Automation Org')::text);
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Shop')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'w.member@example.com', 'member'));
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'w.viewer@example.com', 'viewer'));
select kwtest.login('w.member@example.com'); select public.accept_invitation(kwtest.get('tm'));
select kwtest.login('w.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

select kwtest.login('w.member@example.com');
select kwtest.set('wf', public.save_workflow(kwtest.uuid('proj'), null, 'New order to Slack', 'webhook', null, '{"steps":[{"id":"notify","type":"slack","text":"v1"}]}')::text);
select kwtest.ok(kwtest.get('wf') is not null, 'members can save a draft workflow');
select kwtest.eq((select enabled from public.workflows where id = kwtest.uuid('wf')), false, 'saved workflows start switched off');
select kwtest.throws(format('select public.set_workflow_enabled(%L, true)', kwtest.get('wf')), 'project.manage', 'members cannot switch workflows on');
select kwtest.throws(format('select public.save_workflow(%L, null, ''Bad'', ''manual'', null, ''{"steps":[]}'')', kwtest.get('proj')), 'check constraint', 'a workflow needs 1-25 steps');
select kwtest.throws(format('select public.save_workflow(%L, null, ''Cron'', ''schedule'', null, ''{"steps":[{"id":"a"}]}'')', kwtest.get('proj')), 'check constraint', 'scheduled workflows need a schedule');
select kwtest.set('run1', public.run_workflow_now(kwtest.uuid('wf'), '{"order":1}')::text);
select kwtest.ok(kwtest.get('run1') is not null, 'members can run a workflow now');

select kwtest.login('w.viewer@example.com');
select kwtest.throws(format('select public.run_workflow_now(%L)', kwtest.get('wf')), 'project.write', 'viewers cannot run workflows');
select kwtest.throws(format('select public.save_workflow(%L, null, ''X'', ''manual'', null, ''{"steps":[{"id":"a"}]}'')', kwtest.get('proj')), 'project.write', 'viewers cannot save workflows');

select kwtest.login('w.owner@example.com');
select kwtest.lives(format('select public.set_workflow_enabled(%L, true)', kwtest.get('wf')), 'owners switch workflows on');
select kwtest.throws(format('select public.set_workflow_enabled(public.save_workflow(%L, null, ''Daily'', ''schedule'', ''0 7 * * 1-5'', ''{"steps":[{"id":"a"}]}''), true)', kwtest.get('proj')), 'next run time', 'scheduled workflows need their next run time to switch on');
select public.save_workflow(kwtest.uuid('proj'), kwtest.uuid('wf'), 'New order to Slack', 'webhook', null, '{"steps":[{"id":"notify","type":"slack","text":"v2"}]}');
select kwtest.eq((select enabled from public.workflows where id = kwtest.uuid('wf')), false, 'editing a live workflow switches it off until re-enabled');
select kwtest.eq((select definition -> 'steps' -> 0 ->> 'text' from public.workflow_runs where id = kwtest.uuid('run1')), 'v1', 'runs keep their definition snapshot');
select kwtest.eq((select workflow_version from public.workflow_runs where id = kwtest.uuid('run1')), 1, 'runs record the version they ran');
reset role;
select kwtest.throws(format('update public.workflow_runs set definition = ''{}'' where id = %L', kwtest.get('run1')), 'immutable', 'a run''s snapshot cannot change');

-- Leases
set role service_role;
select kwtest.eq((select count(*) from public.claim_workflow_runs('r1', 10, 60))::int, 1, 'the runner leases a queued run');
select kwtest.eq((select count(*) from public.claim_workflow_runs('r2', 10, 60))::int, 0, 'a leased run is not handed out twice');
reset role;
update public.workflow_runs set lease_expires_at = now() - interval '1 second' where id = kwtest.uuid('run1');
set role service_role;
select kwtest.eq((select lease_owner from public.claim_workflow_runs('r3', 10, 60) limit 1), 'r3', 'an expired lease is re-claimed');
reset role;
insert into public.workflow_runs(workflow_id, project_id, org_id, trigger_kind, definition, workflow_version, attempts)
values (kwtest.uuid('wf'), kwtest.uuid('proj'), kwtest.uuid('org'), 'manual', '{"steps":[{"id":"a"}]}', 1, 100);
set role service_role;
select public.claim_workflow_runs('r4', 10, 60);
reset role;
select kwtest.eq((select count(*) from public.workflow_runs where error = 'runaway run stopped')::int, 1, 'runaway runs are stopped');

-- Step logs
insert into public.workflow_run_steps(run_id, step_id, attempt, status, output) values (kwtest.uuid('run1'), 'notify', 1, 'succeeded', '{"ok":true}');
select kwtest.ok((select org_id from public.workflow_run_steps where run_id = kwtest.uuid('run1') limit 1) = kwtest.uuid('org'), 'step logs inherit org_id');
select kwtest.throws('update public.workflow_run_steps set status = ''failed''', 'append-only', 'step logs cannot be edited');
select kwtest.throws('delete from public.workflow_run_steps', 'append-only', 'step logs cannot be deleted');

-- Webhooks
select kwtest.login('w.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.set_webhook_secret(%L, ''{"ciphertext":"a","iv":"b","auth_tag":"c","wrapped_key":"d","key_version":1}'')', kwtest.get('wf')), 'project.manage', 'members cannot rotate webhook secrets');
select kwtest.login('w.owner@example.com');
select kwtest.set('ep', public.set_webhook_secret(kwtest.uuid('wf'), '{"ciphertext":"a","iv":"b","auth_tag":"c","wrapped_key":"d","key_version":1}')::text);
select kwtest.throws('select ciphertext from public.webhook_endpoints', 'permission denied', 'webhook signing secrets are not readable');
reset role;
set role service_role;
select kwtest.throws(format('select public.record_webhook_delivery(%L, %L, ''{}'')', kwtest.get('ep'), repeat('1', 64)), 'switched off', 'deliveries to a switched-off workflow are refused');
reset role;
select kwtest.login('w.owner@example.com');
set role authenticated;
select public.set_workflow_enabled(kwtest.uuid('wf'), true);
reset role;
set role service_role;
select kwtest.ok(public.record_webhook_delivery(kwtest.uuid('ep'), repeat('2', 64), '{"order":7}') is not null, 'a verified delivery queues a run');
select kwtest.throws(format('select public.record_webhook_delivery(%L, %L, ''{}'')', kwtest.get('ep'), repeat('2', 64)), 'replayed', 'a replayed delivery is refused');
reset role;
select kwtest.login('w.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.record_webhook_delivery(%L, %L, ''{}'')', kwtest.get('ep'), repeat('3', 64)), 'permission denied', 'clients cannot inject deliveries');
select kwtest.throws('select * from public.claim_workflow_runs(''x'')', 'permission denied', 'clients cannot lease runs');
select kwtest.lives(format('select public.cancel_workflow_run(%L)', kwtest.get('run1')), 'members can cancel a run');
select kwtest.throws(format('select public.cancel_workflow_run(%L)', kwtest.get('run1')), 'already finished', 'finished runs cannot be cancelled');
reset role;
