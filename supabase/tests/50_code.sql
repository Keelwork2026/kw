-- Phase 5: hand edits vs agent locks, archived projects, immutable history.
select kwtest.file(:'kwfile');

select kwtest.mk_user('c.owner@example.com');
select kwtest.mk_user('c.member@example.com');
select kwtest.mk_user('c.viewer@example.com');
select kwtest.login('c.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Code Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Code')::text);
select kwtest.set('arch', public.create_project(kwtest.uuid('org'), 'Old')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'c.member@example.com', 'member'));
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 'c.viewer@example.com', 'viewer'));
select public.archive_project(kwtest.uuid('arch'));
select kwtest.login('c.member@example.com'); select public.accept_invitation(kwtest.get('tm'));
select kwtest.login('c.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

reset role;
with r as (insert into public.agent_runs(project_id, org_id, status) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'running') returning id)
select kwtest.set('run', id::text) from r;
insert into public.file_locks(project_id, org_id, path, run_id, holder) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'app/page.tsx', kwtest.uuid('run'), 'worker');

select kwtest.login('c.member@example.com');
set role authenticated;
select kwtest.throws(format('select public.begin_code_edit(%L, ''app/page.tsx'')', kwtest.get('proj')), 'agent is editing', 'hand edits are refused while an agent holds the lock');
select kwtest.set('edit', public.begin_code_edit(kwtest.uuid('proj'), 'app/about/page.tsx', repeat('a', 64))::text);
select kwtest.ok(kwtest.get('edit') is not null, 'unlocked files can be edited');
select kwtest.eq((select status from public.code_edits where id = kwtest.uuid('edit')), 'pending', 'edits start pending');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'code.edit_started' and org_id = kwtest.uuid('org')) is not true, 'members cannot read the audit trail of edits');
select kwtest.throws(format('select public.begin_code_edit(%L, ''app/x.tsx'')', kwtest.get('arch')), 'archived', 'archived projects are read-only');
select kwtest.throws(format('select public.begin_code_edit(%L, ''../etc/passwd'')', kwtest.get('proj')), 'cannot be edited', 'traversal paths are refused');
select kwtest.throws(format('select public.begin_code_edit(%L, ''.env.local'')', kwtest.get('proj')), 'cannot be edited', 'env files cannot be hand-edited');
select kwtest.throws(format('select public.begin_code_edit(%L, ''.git/config'')', kwtest.get('proj')), 'cannot be edited', '.git cannot be hand-edited');
select kwtest.set('mig', public.begin_code_edit(kwtest.uuid('proj'), 'supabase/migrations/1_init.sql')::text);
select kwtest.ok((select is_migration from public.code_edits where id = kwtest.uuid('mig')), 'migration paths are flagged');
select kwtest.throws(format('update public.code_edits set status = ''saved'' where id = %L', kwtest.get('edit')), 'permission denied', 'clients cannot update edits directly');

select kwtest.login('c.owner@example.com');
select kwtest.throws(format('select public.finish_code_edit(%L, ''saved'', ''abc1234'')', kwtest.get('edit')), 'only the author', 'only the author finishes an edit');
select kwtest.login('c.member@example.com');
select kwtest.throws(format('select public.finish_code_edit(%L, ''saved'')', kwtest.get('edit')), 'needs its commit', 'a saved edit records its commit');
select kwtest.lives(format('select public.finish_code_edit(%L, ''saved'', ''abc1234def'')', kwtest.get('edit')), 'the author records the commit');
select kwtest.throws(format('select public.finish_code_edit(%L, ''failed'')', kwtest.get('edit')), 'immutable', 'finished edits cannot change');
reset role;
select kwtest.throws(format('update public.code_edits set commit_sha = ''0000000'' where id = %L', kwtest.get('edit')), 'immutable', 'history is immutable even for the database owner');
select kwtest.throws('delete from public.code_edits', 'immutable', 'history cannot be deleted');

-- Pausing the build releases locks, so people can edit
select kwtest.login('c.member@example.com');
set role authenticated;
select public.control_run(kwtest.uuid('run'), 'pause');
select kwtest.lives(format('select public.begin_code_edit(%L, ''app/page.tsx'')', kwtest.get('proj')), 'pausing the build frees files for hand edits');
select kwtest.login('c.viewer@example.com');
select kwtest.throws(format('select public.begin_code_edit(%L, ''app/y.tsx'')', kwtest.get('proj')), 'project.write', 'viewers cannot edit code');
select kwtest.ok((select count(*) from public.code_edits where project_id = kwtest.uuid('proj')) >= 3, 'viewers can read the edit history');
reset role;
