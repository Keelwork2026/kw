-- Phase 1: tenant isolation, roles, invitations, audit immutability,
-- last-owner protection.
select kwtest.file(:'kwfile');

select kwtest.mk_user('alice@example.com');
select kwtest.mk_user('bob@example.com');
select kwtest.mk_user('carol@example.com');
select kwtest.mk_user('dave@example.com');
select kwtest.mk_user('erin@example.com');
select kwtest.mk_user('vic@example.com');

-- handle_new_user
select kwtest.eq((select count(*) from public.profiles where id = kwtest.uuid('user:alice@example.com'))::int, 1, 'new user gets a profile');
select kwtest.ok(exists (select 1 from public.org_members m join public.organizations o on o.id = m.org_id
  where m.user_id = kwtest.uuid('user:alice@example.com') and m.role = 'owner' and o.personal), 'new user owns a personal organization');
select kwtest.ok(exists (select 1 from public.workspaces w join public.org_members m on m.org_id = w.org_id
  where m.user_id = kwtest.uuid('user:alice@example.com')), 'personal organization has a default workspace');
select kwtest.ok(exists (select 1 from public.audit_events where action = 'org.created'
  and actor_id = kwtest.uuid('user:alice@example.com')), 'organization creation is audited');

-- Alice creates Acme
select kwtest.login('alice@example.com');
set role authenticated;
select kwtest.set('acme', public.create_organization('Acme Inc')::text);
select kwtest.ok(kwtest.get('acme') is not null, 'create_organization returns an id');
select kwtest.eq((select count(*) from public.organizations where id = kwtest.uuid('acme'))::int, 1, 'owner sees the new organization');
select kwtest.throws('insert into public.organizations(name, slug) values (''x'', ''x'')', 'permission denied', 'clients cannot insert organizations directly');
select kwtest.throws(format('update public.org_members set role = ''viewer'' where org_id = %L', kwtest.get('acme')), 'permission denied', 'clients cannot update memberships directly');
select kwtest.throws('insert into public.audit_events(action) values (''forged'')', 'permission denied', 'clients cannot write audit events');
select kwtest.throws('select public._audit(null, ''x'', null, null)', 'permission denied', 'internal _audit is not callable by clients');

-- Invitations
select kwtest.set('tok_bob', public.create_invitation(kwtest.uuid('acme'), 'Bob@Example.com', 'member'));
select kwtest.ok(kwtest.get('tok_bob') ~ '^[0-9a-f]{64}$', 'invitation returns a 64-hex token once');
select kwtest.throws('select token_hash from public.invitations', 'permission denied', 'token hashes are not selectable by clients');
select kwtest.eq((select count(*) from public.invitations where org_id = kwtest.uuid('acme'))::int, 1, 'inviter can list invitations');
select kwtest.set('tok_dave', public.create_invitation(kwtest.uuid('acme'), 'dave@example.com', 'admin'));
select kwtest.set('tok_erin', public.create_invitation(kwtest.uuid('acme'), 'erin@example.com', 'owner'));
select kwtest.set('tok_vic', public.create_invitation(kwtest.uuid('acme'), 'vic@example.com', 'viewer'));

reset role;
select kwtest.ok((select token_hash from public.invitations where email = 'bob@example.com')
  = encode(extensions.digest(kwtest.get('tok_bob'), 'sha256'), 'hex'), 'only the sha256 of the token is stored');

-- Bob is not a member yet
select kwtest.login('bob@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.organizations where id = kwtest.uuid('acme'))::int, 0, 'non-members cannot see the organization');
select kwtest.eq((select count(*) from public.invitations where org_id = kwtest.uuid('acme'))::int, 0, 'non-members cannot see invitations');

-- Carol can't use Bob's invitation
select kwtest.login('carol@example.com');
select kwtest.throws(format('select public.accept_invitation(%L)', kwtest.get('tok_bob')), 'different email', 'invitation is bound to its email address');

select kwtest.login('bob@example.com');
select kwtest.eq(public.accept_invitation(kwtest.get('tok_bob')), kwtest.uuid('acme'), 'invitee accepts and joins');
select kwtest.eq((select role::text from public.org_members where org_id = kwtest.uuid('acme') and user_id = auth.uid()), 'member', 'invitee gets the invited role');
select kwtest.throws(format('select public.accept_invitation(%L)', kwtest.get('tok_bob')), 'invalid', 'invitations are single use');
select kwtest.throws('select public.accept_invitation(''nope'')', 'invalid', 'malformed tokens are refused');
select kwtest.throws(format('select public.create_invitation(%L, ''z@example.com'', ''member'')', kwtest.get('acme')), 'members.invite', 'members cannot invite');
select kwtest.throws(format('select public.update_member_role(%L, %L, ''admin'')', kwtest.get('acme'), kwtest.get('user:bob@example.com')), 'members.manage', 'members cannot change roles');
select kwtest.eq((select count(*) from public.audit_events where org_id = kwtest.uuid('acme'))::int, 0, 'members cannot read the organization audit log');

select kwtest.login('dave@example.com');
select public.accept_invitation(kwtest.get('tok_dave'));
select kwtest.throws(format('select public.create_invitation(%L, ''o@example.com'', ''owner'')', kwtest.get('acme')), 'only owners', 'admins cannot invite owners');
select kwtest.throws(format('select public.update_member_role(%L, %L, ''member'')', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'only owners', 'admins cannot demote owners');
select kwtest.throws(format('select public.remove_member(%L, %L)', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'only owners', 'admins cannot remove owners');

-- Revoked and expired invitations
select kwtest.login('alice@example.com');
select kwtest.set('tok_carol', public.create_invitation(kwtest.uuid('acme'), 'carol@example.com', 'member'));
select public.revoke_invitation((select id from public.invitations where email = 'carol@example.com' and revoked_at is null));
select kwtest.login('carol@example.com');
select kwtest.throws(format('select public.accept_invitation(%L)', kwtest.get('tok_carol')), 'invalid', 'revoked invitations cannot be accepted');

select kwtest.login('alice@example.com');
select kwtest.set('tok_carol2', public.create_invitation(kwtest.uuid('acme'), 'carol@example.com', 'member'));
reset role;
update public.invitations set expires_at = now() - interval '1 minute' where email = 'carol@example.com' and revoked_at is null;
select kwtest.login('carol@example.com');
set role authenticated;
select kwtest.throws(format('select public.accept_invitation(%L)', kwtest.get('tok_carol2')), 'invalid', 'expired invitations cannot be accepted');

-- Last-owner protection
select kwtest.login('alice@example.com');
select kwtest.throws(format('select public.update_member_role(%L, %L, ''admin'')', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'at least one owner', 'the last owner cannot be demoted');
select kwtest.throws(format('select public.remove_member(%L, %L)', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'at least one owner', 'the last owner cannot leave');
select kwtest.throws(format('select public.set_member_status(%L, %L, ''suspended'')', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'own status', 'you cannot suspend yourself');

select kwtest.login('erin@example.com');
select public.accept_invitation(kwtest.get('tok_erin'));
select kwtest.login('alice@example.com');
select kwtest.lives(format('select public.set_member_status(%L, %L, ''suspended'')', kwtest.get('acme'), kwtest.get('user:erin@example.com')), 'an owner can suspend another owner');
select kwtest.throws(format('select public.update_member_role(%L, %L, ''admin'')', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'at least one owner', 'suspended owners do not count towards the last owner');
select kwtest.login('erin@example.com');
select kwtest.throws(format('select public.set_member_status(%L, %L, ''suspended'')', kwtest.get('acme'), kwtest.get('user:alice@example.com')), 'members.manage', 'a suspended owner has no permissions');

-- Suspension cuts access
select kwtest.login('alice@example.com');
select kwtest.lives(format('select public.set_member_status(%L, %L, ''suspended'')', kwtest.get('acme'), kwtest.get('user:bob@example.com')), 'owners can suspend members');
select kwtest.login('bob@example.com');
select kwtest.eq((select count(*) from public.organizations where id = kwtest.uuid('acme'))::int, 0, 'suspended members lose access to the organization');
select kwtest.ok(not public.has_permission(kwtest.uuid('acme'), 'project.read'), 'suspended members have no permissions');
select kwtest.ok(not public.is_org_member(kwtest.uuid('acme')), 'suspended members are not active members');
select kwtest.login('alice@example.com');
select public.set_member_status(kwtest.uuid('acme'), kwtest.uuid('user:bob@example.com'), 'active');
select kwtest.login('bob@example.com');
select kwtest.eq((select count(*) from public.organizations where id = kwtest.uuid('acme'))::int, 1, 'reactivated members regain access');

-- Viewer and roles
select kwtest.login('vic@example.com');
select public.accept_invitation(kwtest.get('tok_vic'));
select kwtest.ok(public.has_permission(kwtest.uuid('acme'), 'project.read') and not public.has_permission(kwtest.uuid('acme'), 'project.write'), 'viewers read but do not write projects');
select kwtest.throws(format('insert into public.workspaces(org_id, name) values (%L, ''W'')', kwtest.get('acme')), 'row-level security', 'viewers cannot create workspaces');
reset role;
select kwtest.ok(exists (select 1 from public.role_permissions where role = 'billing' and permission = 'billing.manage')
  and not exists (select 1 from public.role_permissions where role = 'billing' and permission = 'project.read'), 'billing role manages billing but cannot read projects');

-- Profiles
select kwtest.login('carol@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.profiles where id = kwtest.uuid('user:alice@example.com'))::int, 0, 'profiles are hidden from people who share no organization');
select kwtest.eq(kwtest.val(format('with u as (update public.profiles set display_name = ''hacked'' where id = %L returning 1) select count(*) from u', kwtest.get('user:alice@example.com')))::int, 0, 'nobody can edit someone else''s profile');
select kwtest.login('bob@example.com');
select kwtest.eq((select count(*) from public.profiles where id = kwtest.uuid('user:alice@example.com'))::int, 1, 'co-members can see each other''s profile');

-- Audit log
select kwtest.login('alice@example.com');
select kwtest.ok((select count(*) from public.audit_events where org_id = kwtest.uuid('acme')) >= 6, 'owners can read the organization audit log');
select kwtest.lives('select public.record_security_event(''auth.password_changed'', ''{}'')', 'users can record their own security events');
select kwtest.throws('select public.record_security_event(''auth.anything'', ''{}'')', 'unknown security event', 'unknown security events are refused');
select kwtest.login('bob@example.com');
select kwtest.eq((select count(*) from public.audit_events where action = 'auth.password_changed' and actor_id = kwtest.uuid('user:alice@example.com'))::int, 0, 'personal security events are private');
select kwtest.lives(format('select public.remove_member(%L, auth.uid())', kwtest.get('acme')), 'members can leave an organization');

reset role;
select kwtest.throws('update public.audit_events set action = ''x''', 'append-only', 'audit events cannot be updated, even by the database owner');
select kwtest.throws('delete from public.audit_events', 'append-only', 'audit events cannot be deleted');
select kwtest.throws('truncate public.audit_events', 'append-only', 'audit events cannot be truncated');

set role anon;
select kwtest.throws('select * from public.organizations', 'permission denied', 'anon cannot read organizations');
select kwtest.throws('select public.create_organization(''x'')', 'permission denied', 'anon cannot call RPCs');
reset role;
