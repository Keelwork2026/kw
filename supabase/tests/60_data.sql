-- Phase 6: secrets are unreadable by clients; secret.manage split; the
-- migration ledger refuses drift, double-apply and unconfirmed destructive
-- changes, and releases stale attempts.
select kwtest.file(:'kwfile');

select kwtest.mk_user('d.owner@example.com');
select kwtest.mk_user('d.admin@example.com');
select kwtest.mk_user('d.member@example.com');
select kwtest.mk_user('d.outsider@example.com');
select kwtest.login('d.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Data Org')::text);
select kwtest.plan(kwtest.uuid('org'), 'enterprise');
select kwtest.set('proj', public.create_project(kwtest.uuid('org'), 'Data')::text);
select kwtest.set('ta', public.create_invitation(kwtest.uuid('org'), 'd.admin@example.com', 'admin'));
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'd.member@example.com', 'member'));
select kwtest.login('d.admin@example.com'); select public.accept_invitation(kwtest.get('ta'));
select kwtest.login('d.member@example.com'); select public.accept_invitation(kwtest.get('tm'));

-- Secrets
select kwtest.login('d.admin@example.com');
select kwtest.lives(format('select public.set_project_secret(%L, ''STRIPE_SECRET_KEY'', ''development'', ''{"ciphertext":"Y3Q=","iv":"aXY=","auth_tag":"dGFn","wrapped_key":"d2s=","key_version":1}'')', kwtest.get('proj')), 'admins can store an encrypted secret');
select kwtest.throws(format('select public.set_project_secret(%L, ''PLAIN'', ''development'', ''{"value":"sk_live_x"}'')', kwtest.get('proj')), 'encrypted by the server', 'plaintext values are refused');
select kwtest.throws(format('select public.set_project_secret(%L, ''lower_case'', ''development'', ''{"ciphertext":"a","iv":"b","auth_tag":"c","wrapped_key":"d","key_version":1}'')', kwtest.get('proj')), 'secret names', 'secret names are validated');
select kwtest.throws(format('select public.set_project_secret(%L, ''X_KEY'', ''staging'', ''{"ciphertext":"a","iv":"b","auth_tag":"c","wrapped_key":"d","key_version":1}'')', kwtest.get('proj')), 'unknown environment', 'environments are validated');
select kwtest.lives(format('select public.set_project_secret(%L, ''STRIPE_SECRET_KEY'', ''development'', ''{"ciphertext":"bmV3","iv":"aXY=","auth_tag":"dGFn","wrapped_key":"d2s=","key_version":2}'')', kwtest.get('proj')), 'setting again replaces the value');
select kwtest.eq((select key_version from public.project_secrets where project_id = kwtest.uuid('proj') and name = 'STRIPE_SECRET_KEY'), 2, 'the replacement is stored');
select kwtest.throws('select ciphertext from public.project_secrets', 'permission denied', 'ciphertext is not readable by clients');
select kwtest.throws('select wrapped_key from public.project_secrets', 'permission denied', 'wrapped keys are not readable by clients');
select kwtest.throws('select * from public.project_secrets', 'permission denied', 'select * cannot reach ciphertext either');
select kwtest.eq((select count(*) from public.project_secrets where project_id = kwtest.uuid('proj'))::int, 1, 'secret names are listed for members');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'secret.set' and org_id = kwtest.uuid('org') and metadata ->> 'name' = 'STRIPE_SECRET_KEY'), 'secret changes are audited by name');
select kwtest.ok(not exists (select 1 from public.audit_events where action = 'secret.set' and metadata::text like '%bmV3%'), 'the audit log never holds ciphertext');

select kwtest.login('d.member@example.com');
select kwtest.throws(format('select public.set_project_secret(%L, ''X_KEY'', ''development'', ''{"ciphertext":"a","iv":"b","auth_tag":"c","wrapped_key":"d","key_version":1}'')', kwtest.get('proj')), 'secret.manage', 'members cannot set secrets');
select kwtest.throws(format('select public.delete_project_secret(%L, ''STRIPE_SECRET_KEY'', ''development'')', kwtest.get('proj')), 'secret.manage', 'members cannot delete secrets');
select kwtest.eq((select count(*) from public.project_secrets where project_id = kwtest.uuid('proj'))::int, 1, 'members can see secret names');
select kwtest.throws(format('insert into public.project_secrets(project_id, name, environment, ciphertext, iv, auth_tag, wrapped_key, key_version) values (%L, ''X'', ''development'', ''a'', ''b'', ''c'', ''d'', 1)', kwtest.get('proj')), 'permission denied', 'secrets cannot be inserted directly');
select kwtest.login('d.outsider@example.com');
select kwtest.eq((select count(*) from public.project_secrets where project_id = kwtest.uuid('proj'))::int, 0, 'outsiders cannot see secret names');
select kwtest.login('d.owner@example.com');
select kwtest.lives(format('select public.delete_project_secret(%L, ''STRIPE_SECRET_KEY'', ''development'')', kwtest.get('proj')), 'owners can delete secrets');

-- Migrations
select kwtest.login('d.member@example.com');
select kwtest.throws(format('select public.request_migration_apply(%L, ''001_init.sql'', %L, ''additive'')', kwtest.get('proj'), repeat('a', 64)), 'project.manage', 'members cannot apply migrations');
select kwtest.login('d.owner@example.com');
select kwtest.set('m1', public.request_migration_apply(kwtest.uuid('proj'), '001_init.sql', repeat('a', 64), 'additive')::text);
select kwtest.throws(format('select public.request_migration_apply(%L, ''001_init.sql'', %L, ''additive'')', kwtest.get('proj'), repeat('a', 64)), 'already being applied', 'a migration cannot be applied twice at once');
select kwtest.lives(format('select public.complete_migration_apply(%L, true)', kwtest.get('m1')), 'the requester records success');
select kwtest.throws(format('select public.request_migration_apply(%L, ''001_init.sql'', %L, ''additive'')', kwtest.get('proj'), repeat('a', 64)), 'already applied', 'double-apply is refused');
select kwtest.throws(format('select public.request_migration_apply(%L, ''001_init.sql'', %L, ''additive'')', kwtest.get('proj'), repeat('b', 64)), 'drift', 'a changed file is drift');
select kwtest.throws(format('select public.request_migration_apply(%L, ''002_drop.sql'', %L, ''destructive'')', kwtest.get('proj'), repeat('c', 64)), 'type the file name', 'destructive migrations need typed confirmation');
select kwtest.throws(format('select public.request_migration_apply(%L, ''002_drop.sql'', %L, ''destructive'', ''yes'')', kwtest.get('proj'), repeat('c', 64)), 'type the file name', 'the confirmation must be the file name');
select kwtest.lives(format('select public.request_migration_apply(%L, ''002_drop.sql'', %L, ''destructive'', ''002_drop.sql'')', kwtest.get('proj'), repeat('c', 64)), 'a confirmed destructive migration can be applied');
select kwtest.throws(format('select public.request_migration_apply(%L, ''003.sql'', %L, ''denied'')', kwtest.get('proj'), repeat('d', 64)), 'denied migrations', 'denied migrations are never applied');
reset role;
update public.project_migrations set attempt_started_at = now() - interval '20 minutes' where filename = '002_drop.sql' and status = 'pending';
select kwtest.login('d.owner@example.com');
set role authenticated;
select kwtest.lives(format('select public.request_migration_apply(%L, ''002_drop.sql'', %L, ''destructive'', ''002_drop.sql'')', kwtest.get('proj'), repeat('c', 64)), 'stale attempts are released and retried');
select kwtest.eq((select error from public.project_migrations where filename = '002_drop.sql' and status = 'failed'), 'stale attempt released', 'the stale attempt is recorded as failed');
select kwtest.login('d.admin@example.com');
select kwtest.throws(format('select public.complete_migration_apply((select id from public.project_migrations where filename = ''002_drop.sql'' and status = ''pending''), true)'), 'only the requester', 'only the requester records the outcome');
reset role;
select kwtest.throws(format('update public.project_migrations set checksum = %L where id = %L', repeat('f', 64), kwtest.get('m1')), 'immutable', 'applied migrations are immutable');
select kwtest.throws('delete from public.project_migrations', 'append-only', 'the ledger cannot be deleted');
