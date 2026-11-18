-- Phase 9: permissions and confirmation, critical findings block
-- deploys (people and agents), lifecycle, atomic go-live and rollback,
-- one live deployment, export audit.
select kwtest.file(:'kwfile');

select kwtest.mk_user('dp.owner@example.com');
select kwtest.mk_user('dp.member@example.com');
select kwtest.mk_user('dp.outsider@example.com');
select kwtest.login('dp.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Deploy Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Shop')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'dp.member@example.com', 'member'));
select kwtest.login('dp.member@example.com'); select public.accept_invitation(kwtest.get('tm'));

select kwtest.throws(format('select public.request_deployment(%L, ''preview'')', kwtest.get('proj')), 'project.manage', 'members cannot deploy');
select kwtest.login('dp.owner@example.com');
select kwtest.throws(format('select public.request_deployment(%L, ''production'')', kwtest.get('proj')), 'confirm', 'production needs confirmation');
select kwtest.throws(format('select public.request_deployment(%L, ''staging'', true)', kwtest.get('proj')), 'preview or production', 'environments are validated');
select kwtest.set('d1', public.request_deployment(kwtest.uuid('proj'), 'production', true)::text);
select kwtest.ok(kwtest.get('d1') is not null, 'owners deploy to production with confirmation');
select kwtest.throws(format('select public.request_deployment(%L, ''production'', true)', kwtest.get('proj')), 'deployments_one_active', 'one active deployment per environment');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'deployment.requested' and org_id = kwtest.uuid('org')), 'deployments are audited');

-- Lifecycle
reset role;
select kwtest.throws(format('update public.deployments set status = ''live'' where id = %L', kwtest.get('d1')), 'cannot go from queued to live', 'a deployment cannot jump to live');
set role service_role;
select kwtest.eq((select count(*) from public.claim_deployments('w1', 5))::int, 1, 'the worker claims the deployment');
select kwtest.throws(format('select public.mark_deployment_live(%L, ''https://x'', ''v1'')', kwtest.get('d1')), 'only a verified', 'go-live needs verification');
reset role;
update public.deployments set status = 'uploading' where id = kwtest.uuid('d1');
select kwtest.throws(format('update public.deployments set status = ''verifying'' where id = %L', kwtest.get('d1')), 'cannot go from uploading to verifying', 'building cannot be skipped');
update public.deployments set status = 'building' where id = kwtest.uuid('d1');
update public.deployments set status = 'verifying' where id = kwtest.uuid('d1');
set role service_role;
select kwtest.lives(format('select public.mark_deployment_live(%L, ''https://shop.example.workers.dev'', ''v1'')', kwtest.get('d1')), 'a verified deployment goes live');
reset role;
select kwtest.eq((select status::text from public.projects where id = kwtest.uuid('proj')), 'live', 'a live production deploy marks the project live');

-- Second deployment supersedes the first atomically
select kwtest.login('dp.owner@example.com');
set role authenticated;
select kwtest.set('d2', public.request_deployment(kwtest.uuid('proj'), 'production', true)::text);
reset role;
update public.deployments set status = 'collecting' where id = kwtest.uuid('d2');
update public.deployments set status = 'uploading' where id = kwtest.uuid('d2');
update public.deployments set status = 'building' where id = kwtest.uuid('d2');
update public.deployments set status = 'verifying' where id = kwtest.uuid('d2');
select kwtest.throws(format('insert into public.deployments(project_id, org_id, environment, status) values (%L, %L, ''production'', ''live'')', kwtest.get('proj'), kwtest.get('org')), 'start queued', 'deployments cannot be inserted as live');
set role service_role;
select public.mark_deployment_live(kwtest.uuid('d2'), 'https://shop.example.workers.dev', 'v2');
reset role;
select kwtest.eq((select status from public.deployments where id = kwtest.uuid('d1')), 'superseded', 'the previous live deployment is superseded');
select kwtest.eq((select count(*) from public.deployments where project_id = kwtest.uuid('proj') and environment = 'production' and status = 'live')::int, 1, 'exactly one live deployment per environment');

-- Rollback
select kwtest.login('dp.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.request_rollback(%L, ''production'', %L)', kwtest.get('proj'), kwtest.get('d1')), 'project.manage', 'members cannot roll back');
select kwtest.login('dp.owner@example.com');
select kwtest.throws(format('select public.request_rollback(%L, ''production'', %L)', kwtest.get('proj'), kwtest.get('d2')), 'previous, verified', 'the live version cannot be its own rollback target');
select kwtest.set('rb', public.request_rollback(kwtest.uuid('proj'), 'production', kwtest.uuid('d1'))::text);
select kwtest.eq((select kind || ':' || version_id from public.deployments where id = kwtest.uuid('rb')), 'rollback:v1', 'a rollback restores the chosen version');

-- Critical findings block people and agents
reset role;
update public.deployments set status = 'cancelled' where id = kwtest.uuid('rb');
insert into public.security_findings(project_id, org_id, fingerprint, scanner, rule, severity, title, is_credential)
values (kwtest.uuid('proj'), kwtest.uuid('org'), repeat('e', 32), 'secrets', 'aws-access-key', 'critical', 'AWS key', true);
select kwtest.login('dp.owner@example.com');
set role authenticated;
select kwtest.throws(format('select public.request_deployment(%L, ''preview'')', kwtest.get('proj')), 'critical security findings', 'critical findings block people');
reset role;
set role service_role;
select kwtest.throws(format('select public.queue_deployment(%L, ''preview'')', kwtest.get('proj')), 'critical security findings', 'critical findings block agents');
reset role;
update public.security_findings set status = 'resolved' where fingerprint = repeat('e', 32);
set role service_role;
select kwtest.throws(format('select public.queue_deployment(%L, ''production'')', kwtest.get('proj')), 'person''s approval', 'agents need approval for production');
select kwtest.ok(public.queue_deployment(kwtest.uuid('proj'), 'preview') is not null, 'agents may deploy previews');
reset role;
select kwtest.login('dp.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.queue_deployment(%L, ''preview'')', kwtest.get('proj')), 'permission denied', 'clients cannot use the agent path');
select kwtest.throws(format('select public.mark_deployment_live(%L, ''x'', ''y'')', kwtest.get('d2')), 'permission denied', 'clients cannot mark deployments live');

-- Export audit
select kwtest.lives(format('select public.record_export(%L, 42, 12345, %L)', kwtest.get('proj'), repeat('f', 64)), 'members can export');
select kwtest.login('dp.outsider@example.com');
select kwtest.throws(format('select public.record_export(%L, 1, 1, %L)', kwtest.get('proj'), repeat('f', 64)), 'permission denied', 'outsiders cannot export');
reset role;
select kwtest.ok(exists (select 1 from public.audit_events where action = 'project.exported' and org_id = kwtest.uuid('org')), 'exports are audited');
