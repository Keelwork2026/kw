-- Phase 8: one active check per kind, findings unique per fingerprint,
-- risk acceptance rules.
select kwtest.file(:'kwfile');

select kwtest.mk_user('q.owner@example.com');
select kwtest.mk_user('q.member@example.com');
select kwtest.mk_user('q.viewer@example.com');
select kwtest.login('q.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Quality Org')::text);
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Q')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'q.member@example.com', 'member'));
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'q.viewer@example.com', 'viewer'));
select kwtest.login('q.member@example.com'); select public.accept_invitation(kwtest.get('tm'));
select kwtest.login('q.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

select kwtest.login('q.member@example.com');
select kwtest.eq((select count(*) from public.request_checks(kwtest.uuid('proj'), array['tests', 'lint']))::int, 2, 'members request checks');
select kwtest.set('t1', (select id from public.check_runs where project_id = kwtest.uuid('proj') and kind = 'tests')::text);
select kwtest.eq((select x from public.request_checks(kwtest.uuid('proj'), array['tests']) x), kwtest.uuid('t1'), 'requesting an active kind again returns the same check');
select kwtest.eq((select count(*) from public.check_runs where project_id = kwtest.uuid('proj'))::int, 2, 'no duplicate active check is created');
select kwtest.throws(format('select public.request_checks(%L, array[''deploy''])', kwtest.get('proj')), 'check_runs_kind', 'unknown check kinds are refused');
select kwtest.login('q.viewer@example.com');
select kwtest.throws(format('select public.request_checks(%L, array[''tests''])', kwtest.get('proj')), 'project.write', 'viewers cannot request checks');
reset role;
select kwtest.throws(format('insert into public.check_runs(project_id, org_id, kind) values (%L, %L, ''tests'')', kwtest.get('proj'), kwtest.get('org')), 'check_runs_one_active', 'the database allows one active check per kind');
set role service_role;
select kwtest.eq((select count(*) from public.claim_check_runs('w1', 10))::int, 2, 'the worker claims queued checks');
select kwtest.eq((select count(*) from public.claim_check_runs('w2', 10))::int, 0, 'claimed checks are not handed out twice');
reset role;
update public.check_runs set started_at = now() - interval '30 minutes' where id = kwtest.uuid('t1');
set role service_role;
select public.claim_check_runs('w3', 10);
reset role;
select kwtest.eq((select status from public.check_runs where id = kwtest.uuid('t1')), 'error', 'a check that couldn''t finish is an error, never a pass');

-- Findings
insert into public.security_findings(project_id, org_id, fingerprint, scanner, rule, severity, title, is_credential)
values (kwtest.uuid('proj'), kwtest.uuid('org'), repeat('a', 32), 'secrets', 'stripe-live-key', 'critical', 'Stripe live key committed', true),
       (kwtest.uuid('proj'), kwtest.uuid('org'), repeat('b', 32), 'review', 'route-no-auth', 'medium', 'Route without caller check', false);
select kwtest.throws(format('insert into public.security_findings(project_id, org_id, fingerprint, scanner, rule, severity, title) values (%L, %L, %L, ''review'', ''x'', ''low'', ''dup'')', kwtest.get('proj'), kwtest.get('org'), repeat('b', 32)), 'duplicate key', 'findings are unique per fingerprint');
select kwtest.set('cred', (select id from public.security_findings where fingerprint = repeat('a', 32))::text);
select kwtest.set('route', (select id from public.security_findings where fingerprint = repeat('b', 32))::text);
select kwtest.login('q.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.accept_finding_risk(%L, ''internal tool only, behind VPN'')', kwtest.get('route')), 'project.manage', 'members cannot accept risks');
select kwtest.eq((select count(*) from public.security_findings where project_id = kwtest.uuid('proj'))::int, 2, 'members can read findings');
select kwtest.throws(format('insert into public.security_findings(project_id, fingerprint, scanner, rule, severity, title) values (%L, %L, ''review'', ''x'', ''low'', ''x'')', kwtest.get('proj'), repeat('c', 32)), 'permission denied', 'clients cannot write findings');
select kwtest.login('q.owner@example.com');
select kwtest.throws(format('select public.accept_finding_risk(%L, ''ok'')', kwtest.get('route')), 'at least 10', 'accepting a risk needs a real reason');
select kwtest.lives(format('select public.accept_finding_risk(%L, ''internal tool only, behind VPN'')', kwtest.get('route')), 'managers accept a risk with a reason');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'finding.risk_accepted' and org_id = kwtest.uuid('org')), 'risk acceptance is audited');
select kwtest.throws(format('select public.accept_finding_risk(%L, ''we will rotate it later, promise'')', kwtest.get('cred')), 'committed credentials', 'committed credentials can never be accepted');
reset role;
select kwtest.throws(format('update public.security_findings set status = ''accepted'' where id = %L', kwtest.get('cred')), 'committed credentials', 'not even by the database owner');
select kwtest.login('q.owner@example.com');
set role authenticated;
select kwtest.lives(format('select public.reopen_finding(%L)', kwtest.get('route')), 'managers can reopen an accepted finding');
select kwtest.eq((select status from public.security_findings where id = kwtest.uuid('route')), 'open', 'the finding is open again');
reset role;
