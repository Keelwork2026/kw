-- QA Center: runs are requested (one at a time), results and issues are
-- written only by the worker, triage and risk acceptance follow the rules,
-- settings keep pentest authorisation separate, workspaces are isolated.
select kwtest.file(:'kwfile');

select kwtest.mk_user('qa.owner@example.com');
select kwtest.mk_user('qa.viewer@example.com');
select kwtest.mk_user('qa.outsider@example.com');
select kwtest.login('qa.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('QA Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Quality')::text);
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'qa.viewer@example.com', 'viewer'));
select kwtest.login('qa.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

select kwtest.login('qa.owner@example.com');
select kwtest.set('run', public.request_qa_run(kwtest.uuid('proj'), 'quick', array['functional', 'security'], '{}'::jsonb, 'manual')::text);
select kwtest.ok(kwtest.get('run') is not null, 'members can request a QA run');
select kwtest.throws(format('select public.request_qa_run(%L, %L, array[%L])', kwtest.get('proj'), 'full', 'functional'), 'already in progress', 'only one active run per project');
select kwtest.throws(format('select public.request_qa_run(%L, %L, array[%L], %L::jsonb, %L)', kwtest.get('proj'), 'full', 'functional', '{}', 'after_build'), 'invalid trigger', 'people cannot pretend a run came from a build');
select kwtest.throws(format('insert into public.qa_results (run_id, project_id, org_id, key, name, category, method, status, severity) values (%L, %L, %L, %L, %L, %L, %L, %L, %L)', kwtest.get('run'), kwtest.get('proj'), kwtest.get('org'), 'x', 'x', 'functional', 'automated', 'passed', 'info'), 'permission denied', 'people cannot write results');
select kwtest.throws('select * from public.claim_qa_runs(''w'', 1)', 'permission denied', 'only the worker claims runs');
select public.stop_qa_run(kwtest.uuid('run'));
select kwtest.eq((select status from public.qa_runs where id = kwtest.uuid('run')), 'stopped', 'a queued run can be stopped');

-- The worker records a completed run and an issue.
reset role;
set role service_role;
update public.qa_runs set status = 'completed', readiness = '{"status":"needs_review"}', finished_at = now() where id = kwtest.uuid('run');
insert into public.qa_issues (ref, project_id, org_id, fingerprint, title, category, rule, severity, priority, confidence, description, impact, recommendation, verify, first_run, last_run)
  values (1, kwtest.uuid('proj'), kwtest.uuid('org'), 'aaaaaaaaaaaaaaaa', 'Missing RLS', 'database', 'rls-missing', 'critical', 'P0', 'confirmed', 'd', 'i', 'r', 'v', kwtest.uuid('run'), kwtest.uuid('run'));
insert into public.qa_issues (ref, project_id, org_id, fingerprint, title, category, rule, severity, priority, confidence, description, impact, recommendation, verify)
  values (2, kwtest.uuid('proj'), kwtest.uuid('org'), 'bbbbbbbbbbbbbbbb', 'Secret in client', 'security', 'public-secret-env', 'critical', 'P0', 'probable', 'd', 'i', 'r', 'v');
reset role;
set role authenticated;
select kwtest.set('iss', (select id::text from public.qa_issues where fingerprint = 'aaaaaaaaaaaaaaaa'));
select kwtest.set('sec', (select id::text from public.qa_issues where fingerprint = 'bbbbbbbbbbbbbbbb'));

select kwtest.throws(format('select public.approve_qa_release(%L, %L)', kwtest.get('run'), 'ok'), 'blocking issues', 'a run that needs review cannot be approved');
select kwtest.throws(format('select public.set_qa_issue_status(%L, %L)', kwtest.get('iss'), 'verified'), 'retesting', 'nobody marks an issue verified by hand');
select kwtest.throws(format('select public.set_qa_issue_status(%L, %L, %L)', kwtest.get('iss'), 'false_positive', 'no'), 'explain why', 'dismissing needs a reason');
select public.set_qa_issue_status(kwtest.uuid('iss'), 'in_progress', 'working on it');
select kwtest.eq((select jsonb_array_length(history) from public.qa_issues where id = kwtest.uuid('iss')), 1, 'status changes are recorded');
select kwtest.throws(format('select public.accept_qa_risk(%L, %L, current_date + 200)', kwtest.get('iss'), 'Internal tool behind VPN'), '90 days', 'critical risks need an early review date');
select public.accept_qa_risk(kwtest.uuid('iss'), 'Internal tool behind VPN only', current_date + 30);
select kwtest.eq((select status from public.qa_issues where id = kwtest.uuid('iss')), 'accepted_risk', 'risk accepted with a reason and review date');
select kwtest.throws(format('select public.accept_qa_risk(%L, %L, current_date + 10)', kwtest.get('sec'), 'We will rotate it later'), 'cannot be accepted', 'exposed credentials can never be accepted');

select public.save_qa_settings(kwtest.uuid('proj'), '{"maxPages": 10, "pentestAuthorized": {"by": "me"}}'::jsonb);
select kwtest.ok((select settings -> 'pentestAuthorized' = 'null'::jsonb from public.qa_settings where project_id = kwtest.uuid('proj')), 'settings cannot smuggle in pentest authorisation');
select public.authorize_qa_pentest(kwtest.uuid('proj'), 'Sandbox only, all routes, no load', true);
select kwtest.ok((select settings -> 'pentestAuthorized' ->> 'scope' from public.qa_settings where project_id = kwtest.uuid('proj')) = 'Sandbox only, all routes, no load', 'pentest authorisation is recorded with scope');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'qa.pentest_authorized'), 'and audited');

insert into public.qa_personas (project_id, name, description, goal) values (kwtest.uuid('proj'), 'Ada', 'Older first-time visitor on a phone', 'Book a table for two');
select kwtest.eq((select count(*) from public.qa_personas where project_id = kwtest.uuid('proj'))::int, 1, 'members save personas');

select public.save_qa_settings(kwtest.uuid('proj'), '{"gate": {"enforceOnDeploy": true}}'::jsonb);
reset role;
set role service_role;
select kwtest.throws(format('insert into public.deployments (project_id, org_id, environment) values (%L, %L, %L)', kwtest.get('proj'), kwtest.get('org'), 'production'), 'QA release gate', 'the QA gate blocks production deploys when enforced');
reset role;
set role authenticated;

select kwtest.login('qa.viewer@example.com');
select kwtest.eq((select count(*) from public.qa_issues where project_id = kwtest.uuid('proj'))::int, 2, 'viewers can read issues');
select kwtest.throws(format('select public.request_qa_run(%L, %L, array[%L])', kwtest.get('proj'), 'quick', 'functional'), 'permission', 'viewers cannot start runs');
select kwtest.throws(format('select public.save_qa_settings(%L, %L::jsonb)', kwtest.get('proj'), '{}'), 'permission', 'viewers cannot change settings');

select kwtest.login('qa.outsider@example.com');
select kwtest.eq((select count(*) from public.qa_runs where project_id = kwtest.uuid('proj'))::int, 0, 'other workspaces see no runs');
select kwtest.eq((select count(*) from public.qa_issues where project_id = kwtest.uuid('proj'))::int, 0, 'or issues');
reset role;
