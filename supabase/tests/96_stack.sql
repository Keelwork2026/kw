-- Stack choice: values, fixed after the first build, provider copied to deployments.
select kwtest.file(:'kwfile');

select kwtest.mk_user('s.owner@example.com');
select kwtest.mk_user('s.viewer@example.com');
select kwtest.login('s.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Stack Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Stacked')::text);
select kwtest.set('tv', public.create_invitation(kwtest.uuid('org'), 's.viewer@example.com', 'viewer'));
select kwtest.login('s.viewer@example.com'); select public.accept_invitation(kwtest.get('tv'));

select kwtest.login('s.owner@example.com');
select kwtest.eq((select backend from public.projects where id = kwtest.uuid('proj')), 'supabase', 'Supabase is the default backend');
select kwtest.eq((select deploy_target from public.projects where id = kwtest.uuid('proj')), 'cloudflare', 'Cloudflare is the default deploy target');
select kwtest.lives(format('select public.set_project_stack(%L, ''postgres'', ''vercel'')', kwtest.get('proj')), 'the stack can be chosen before the first build');
select kwtest.eq((select backend || '/' || deploy_target from public.projects where id = kwtest.uuid('proj')), 'postgres/vercel', 'the choice is saved');
select kwtest.lives(format('select public.set_project_stack(%L, ''cloudbase'', ''cloudflare'')', kwtest.get('proj')), 'CloudBase can be chosen');
select kwtest.lives(format('select public.set_project_stack(%L, ''appwrite'', ''cloudflare'')', kwtest.get('proj')), 'Appwrite can be chosen');
select kwtest.throws(format('select public.set_project_stack(%L, ''mysql'', ''cloudflare'')', kwtest.get('proj')), 'unknown backend', 'unknown backends are refused');
select kwtest.throws(format('select public.set_project_stack(%L, ''supabase'', ''netlify'')', kwtest.get('proj')), 'unknown deploy target', 'unknown deploy targets are refused');
select kwtest.throws(format('update public.projects set backend = ''postgres'' where id = %L', kwtest.get('proj')), 'permission denied', 'the backend can''t be changed directly');
select kwtest.login('s.viewer@example.com');
select kwtest.throws(format('select public.set_project_stack(%L, ''supabase'', ''cloudflare'')', kwtest.get('proj')), 'project.write', 'viewers cannot change the stack');

reset role;
insert into public.plans(project_id, org_id, content) values (kwtest.uuid('proj'), kwtest.uuid('org'), '{"summary":"x","pages":["Home"]}');
select kwtest.login('s.owner@example.com');
set role authenticated;
select public.approve_plan((select id from public.plans where project_id = kwtest.uuid('proj')));
select kwtest.throws(format('select public.set_project_stack(%L, ''supabase'', ''cloudflare'')', kwtest.get('proj')), 'fixed after the first build', 'the stack is fixed after the first build');
select kwtest.set('d', public.request_deployment(kwtest.uuid('proj'), 'preview')::text);
select kwtest.eq((select provider from public.deployments where id = kwtest.uuid('d')), 'cloudflare', 'deployments take the project''s deploy target');
reset role;
update public.projects set deploy_target = 'vercel' where id = kwtest.uuid('proj');
update public.deployments set status = 'cancelled' where id = kwtest.uuid('d');
insert into public.deployments(project_id, org_id, environment, provider) values (kwtest.uuid('proj'), kwtest.uuid('org'), 'preview', 'cloudflare');
select kwtest.eq((select provider from public.deployments where project_id = kwtest.uuid('proj') and status = 'queued'), 'vercel', 'a caller cannot choose a different provider');
select kwtest.throws(format('update public.deployments set provider = ''netlify'' where project_id = %L', kwtest.get('proj')), 'deployments_provider', 'only known providers are allowed');
