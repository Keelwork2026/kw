-- Phase 3: plan approval, one active build, file locks, tool-call log,
-- approvals, pause/resume/cancel.
select kwtest.file(:'kwfile');

select kwtest.mk_user('a.owner@example.com');
select kwtest.mk_user('a.member@example.com');
select kwtest.mk_user('a.viewer@example.com');
select kwtest.mk_user('a.outsider@example.com');

select kwtest.login('a.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Agents Org')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'a.member@example.com', 'member'));
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'a.viewer@example.com', 'viewer'));
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Builder')::text);
select kwtest.set('proj2', public.create_project(kwtest.uuid('org'), 'Archived one')::text);
select kwtest.login('a.member@example.com'); select public.accept_invitation(kwtest.get('tm'));
select kwtest.login('a.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

reset role;
with p as (
  insert into public.plans(project_id, org_id, content) values (kwtest.uuid('proj'), kwtest.uuid('org'), '{"summary":"old","pages":["Home"]}') returning id
) select kwtest.set('plan_old', id::text) from p;
with p as (
  insert into public.plans(project_id, org_id, content) values (kwtest.uuid('proj'), kwtest.uuid('org'), '{"summary":"new","pages":["Home"]}') returning id
) select kwtest.set('plan', id::text) from p;
with p as (
  insert into public.plans(project_id, org_id, content) values (kwtest.uuid('proj2'), kwtest.uuid('org'), '{"summary":"x","pages":["Home"]}') returning id
) select kwtest.set('plan2', id::text) from p;
update public.projects set status = 'archived' where id = kwtest.uuid('proj2');

-- Plan approval
select kwtest.login('a.viewer@example.com');
set role authenticated;
select kwtest.throws(format('select public.approve_plan(%L)', kwtest.get('plan')), 'project.write', 'viewers cannot approve plans');
select kwtest.login('a.outsider@example.com');
select kwtest.throws(format('select public.approve_plan(%L)', kwtest.get('plan')), 'permission denied', 'outsiders cannot approve plans');
select kwtest.eq((select count(*) from public.plans where project_id = kwtest.uuid('proj'))::int, 0, 'outsiders cannot see plans');
select kwtest.login('a.member@example.com');
select kwtest.set('run', public.approve_plan(kwtest.uuid('plan'))::text);
select kwtest.ok(kwtest.get('run') is not null, 'members approve plans and a run is queued');
select kwtest.eq((select status::text from public.plans where id = kwtest.uuid('plan')), 'approved', 'the plan is marked approved');
select kwtest.eq((select status::text from public.plans where id = kwtest.uuid('plan_old')), 'superseded', 'other draft plans are superseded');
select kwtest.eq((select status::text from public.projects where id = kwtest.uuid('proj')), 'building', 'the project is building');
select kwtest.eq((select status::text from public.agent_runs where id = kwtest.uuid('run')), 'queued', 'the run starts queued');
select kwtest.throws(format('select public.approve_plan(%L)', kwtest.get('plan')), 'no longer open', 'a plan cannot be approved twice');
select kwtest.throws(format('select public.approve_plan(%L)', kwtest.get('plan2')), 'archived', 'plans of archived projects cannot be approved');
reset role;
insert into public.plans(project_id, org_id, content) values (kwtest.uuid('proj'), kwtest.uuid('org'), '{"summary":"third","pages":["Home"]}');
select kwtest.login('a.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.approve_plan((select id from public.plans where project_id = %L and status = ''draft''))', kwtest.get('proj')), 'already running', 'only one active build per project');
reset role;
select kwtest.throws(format('insert into public.agent_runs(project_id, org_id) values (%L, %L)', kwtest.get('proj'), kwtest.get('org')), 'agent_runs_one_active', 'the database refuses a second active run');

-- Tasks and locks (worker, service role)
insert into public.tasks(run_id, org_id, project_id, key, agent, title, status)
values (kwtest.uuid('run'), kwtest.uuid('org'), kwtest.uuid('proj'), 'arch.scaffold', 'architect', 'Scaffold', 'running'),
       (kwtest.uuid('run'), kwtest.uuid('org'), kwtest.uuid('proj'), 'db.schema', 'database', 'Schema', 'waiting_approval');
select kwtest.set('t1', (select id from public.tasks where key = 'arch.scaffold' and run_id = kwtest.uuid('run'))::text);
select kwtest.set('t2', (select id from public.tasks where key = 'db.schema' and run_id = kwtest.uuid('run'))::text);
set role service_role;
select kwtest.ok(public.acquire_file_lock(kwtest.uuid('proj'), 'app/page.tsx', kwtest.uuid('run'), kwtest.uuid('t1'), 'worker-1'), 'a free file can be locked');
select kwtest.ok(public.acquire_file_lock(kwtest.uuid('proj'), 'app/page.tsx', kwtest.uuid('run'), kwtest.uuid('t1'), 'worker-1'), 're-acquiring your own lock refreshes it');
select kwtest.ok(not public.acquire_file_lock(kwtest.uuid('proj'), 'app/page.tsx', kwtest.uuid('run'), kwtest.uuid('t2'), 'worker-2'), 'another task cannot take a live lock');
reset role;
update public.file_locks set heartbeat_at = now() - interval '11 minutes' where path = 'app/page.tsx';
set role service_role;
select kwtest.ok(public.acquire_file_lock(kwtest.uuid('proj'), 'app/page.tsx', kwtest.uuid('run'), kwtest.uuid('t2'), 'worker-2'), 'a stale lock is taken over');
select kwtest.eq((select holder from public.file_locks where path = 'app/page.tsx'), 'worker-2', 'takeover records the new holder');
select kwtest.ok(public.acquire_file_lock(kwtest.uuid('proj'), 'lib/db.ts', kwtest.uuid('run'), kwtest.uuid('t1'), 'worker-1'), 'locks are per path');
select kwtest.eq(public.release_file_locks(kwtest.uuid('run'), kwtest.uuid('t1')), 1, 'releasing a task''s locks frees only its paths');
select kwtest.ok(public.acquire_file_lock(kwtest.uuid('proj'), 'lib/db.ts', kwtest.uuid('run'), kwtest.uuid('t1'), 'worker-1'), 'released paths can be locked again');
reset role;
select kwtest.login('a.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.acquire_file_lock(%L, ''x'', null, null, ''me'')', kwtest.get('proj')), 'permission denied', 'clients cannot take file locks');
select kwtest.throws(format('select public.release_file_locks(%L)', kwtest.get('run')), 'permission denied', 'clients cannot release file locks');

-- Tool-call log
reset role;
insert into public.tool_calls(org_id, project_id, run_id, task_id, agent, tool, args, decision)
values (kwtest.uuid('org'), kwtest.uuid('proj'), kwtest.uuid('run'), kwtest.uuid('t1'), 'architect', 'fs.write', '{"path":"app/page.tsx"}', 'allow');
select kwtest.throws('update public.tool_calls set decision = ''allow''', 'append-only', 'tool calls cannot be updated');
select kwtest.throws('delete from public.tool_calls', 'append-only', 'tool calls cannot be deleted');
select kwtest.throws('truncate public.tool_calls', 'append-only', 'tool calls cannot be truncated');
select kwtest.throws(format('insert into public.tool_calls(org_id, project_id, agent, tool, decision) values (%L, %L, ''qa'', ''shell.run'', ''deny'')', kwtest.get('org'), kwtest.get('proj')), 'need a reason', 'denied tool calls must say why');
select kwtest.login('a.member@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.tool_calls where run_id = kwtest.uuid('run'))::int, 1, 'members can read the tool-call log');
select kwtest.throws(format('insert into public.tool_calls(org_id, project_id, agent, tool, decision) values (%L, %L, ''qa'', ''x'', ''allow'')', kwtest.get('org'), kwtest.get('proj')), 'permission denied', 'clients cannot forge tool calls');

-- Approvals
reset role;
update public.agent_runs set status = 'waiting_approval' where id = kwtest.uuid('run');
insert into public.approvals(org_id, project_id, run_id, task_id, kind, summary)
values (kwtest.uuid('org'), kwtest.uuid('proj'), kwtest.uuid('run'), kwtest.uuid('t2'), 'install_package', 'Install zod'),
       (kwtest.uuid('org'), kwtest.uuid('proj'), kwtest.uuid('run'), null, 'deploy_production', 'Deploy to production'),
       (kwtest.uuid('org'), kwtest.uuid('proj'), kwtest.uuid('run'), null, 'send_message', 'Email the team'),
       (kwtest.uuid('org'), kwtest.uuid('proj'), kwtest.uuid('run'), null, 'fetch_host', 'Fetch example.org');
update public.approvals set expires_at = now() - interval '1 minute' where kind = 'send_message' and project_id = kwtest.uuid('proj');
select kwtest.set('ap_pkg', (select id from public.approvals where kind = 'install_package' and project_id = kwtest.uuid('proj'))::text);
select kwtest.set('ap_prod', (select id from public.approvals where kind = 'deploy_production' and project_id = kwtest.uuid('proj'))::text);
select kwtest.set('ap_old', (select id from public.approvals where kind = 'send_message' and project_id = kwtest.uuid('proj'))::text);
select kwtest.set('ap_fetch', (select id from public.approvals where kind = 'fetch_host' and project_id = kwtest.uuid('proj'))::text);

select kwtest.login('a.viewer@example.com');
set role authenticated;
select kwtest.throws(format('select public.decide_approval(%L, true)', kwtest.get('ap_pkg')), 'project.write', 'viewers cannot decide approvals');
select kwtest.login('a.member@example.com');
select kwtest.eq(public.decide_approval(kwtest.uuid('ap_pkg'), true, 'ok')::text, 'approved', 'members can approve a package install');
select kwtest.eq((select status::text from public.tasks where id = kwtest.uuid('t2')), 'ready', 'an approved task becomes ready');
select kwtest.throws(format('select public.decide_approval(%L, false)', kwtest.get('ap_pkg')), 'already decided', 'approvals cannot be decided twice');
select kwtest.eq(public.decide_approval(kwtest.uuid('ap_old'), true)::text, 'expired', 'expired approvals cannot be approved');
select kwtest.eq((select status::text from public.approvals where id = kwtest.uuid('ap_old')), 'expired', 'the expiry is recorded');
select kwtest.throws(format('select public.decide_approval(%L, true)', kwtest.get('ap_prod')), 'project.manage', 'production deploys need a manager');
select kwtest.eq((select status::text from public.agent_runs where id = kwtest.uuid('run')), 'waiting_approval', 'the run waits while requests are pending');
select kwtest.login('a.owner@example.com');
select kwtest.eq(public.decide_approval(kwtest.uuid('ap_prod'), false, 'not yet')::text, 'rejected', 'owners can reject a production deploy');
select kwtest.eq(public.decide_approval(kwtest.uuid('ap_fetch'), true)::text, 'approved', 'the last pending request is approved');
select kwtest.eq((select status::text from public.agent_runs where id = kwtest.uuid('run')), 'queued', 'the run resumes once nothing is pending');

-- Pause / resume / cancel
select kwtest.login('a.viewer@example.com');
select kwtest.throws(format('select public.control_run(%L, ''pause'')', kwtest.get('run')), 'project.write', 'viewers cannot pause builds');
select kwtest.login('a.member@example.com');
select kwtest.eq(public.control_run(kwtest.uuid('run'), 'pause')::text, 'paused', 'members can pause a build');
select kwtest.eq((select count(*) from public.file_locks where run_id = kwtest.uuid('run'))::int, 0, 'pausing releases file locks');
select kwtest.throws(format('select public.control_run(%L, ''pause'')', kwtest.get('run')), 'only an active build', 'a paused build cannot be paused again');
select kwtest.eq(public.control_run(kwtest.uuid('run'), 'resume')::text, 'queued', 'a paused build resumes as queued');
reset role;
insert into public.approvals(org_id, project_id, run_id, kind, summary) values (kwtest.uuid('org'), kwtest.uuid('proj'), kwtest.uuid('run'), 'delete_file', 'Delete old.ts');
select kwtest.login('a.member@example.com');
set role authenticated;
select kwtest.eq(public.control_run(kwtest.uuid('run'), 'cancel')::text, 'cancelled', 'members can cancel a build');
select kwtest.eq((select count(*) from public.tasks where run_id = kwtest.uuid('run') and status not in ('cancelled', 'done', 'failed'))::int, 0, 'cancelling cancels unfinished tasks');
select kwtest.eq((select count(*) from public.approvals where run_id = kwtest.uuid('run') and status = 'pending')::int, 0, 'cancelling expires pending approvals');
select kwtest.eq((select status::text from public.projects where id = kwtest.uuid('proj')), 'draft', 'the project returns to draft');
select kwtest.throws(format('select public.control_run(%L, ''cancel'')', kwtest.get('run')), 'already finished', 'a finished build cannot be cancelled');
select kwtest.throws(format('select public.control_run(%L, ''explode'')', kwtest.get('run')), 'unknown action', 'unknown run actions are refused');
reset role;

-- Worker leases
reset role;
select kwtest.set('proj3', (select id from public.projects where name = 'Builder' and org_id = kwtest.uuid('org'))::text);
insert into public.agent_runs(project_id, org_id) values (kwtest.uuid('proj3'), kwtest.uuid('org'));
set role service_role;
select kwtest.eq((select count(*) from public.claim_agent_runs('w1', 5))::int, 1, 'the worker leases a queued run');
select kwtest.eq((select count(*) from public.claim_agent_runs('w2', 5))::int, 0, 'a leased run is not handed out twice');
reset role;
select kwtest.login('a.member@example.com');
set role authenticated;
select kwtest.throws('select * from public.claim_agent_runs(''me'')', 'permission denied', 'clients cannot lease runs');
reset role;
