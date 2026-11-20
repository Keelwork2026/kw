-- Onboarding: people edit only their own profile; experience is one of three
-- values; organization rename is for owners/admins, validated and audited.
select kwtest.file(:'kwfile');

select kwtest.mk_user('onb.owner@example.com');
select kwtest.mk_user('onb.member@example.com');
select kwtest.login('onb.owner@example.com');
set role authenticated;
select kwtest.set('org', public.create_organization('Onboarding Org')::text);
select kwtest.set('tm', public.create_invitation(kwtest.uuid('org'), 'onb.member@example.com', 'member'));
select kwtest.login('onb.member@example.com'); select public.accept_invitation(kwtest.get('tm'));

-- Profile
select kwtest.login('onb.owner@example.com');
select kwtest.eq(kwtest.val('with u as (update public.profiles set display_name = ''Ada'', experience = ''developer'', onboarded_at = now() where id = auth.uid() returning 1) select count(*) from u')::int, 1, 'people update their own profile and onboarding answers');
select kwtest.throws('update public.profiles set experience = ''wizard'' where id = auth.uid()', 'check constraint', 'experience is one of new, some or developer');
select kwtest.eq(kwtest.val(format('with u as (update public.profiles set experience = ''new'' where id = %L returning 1) select count(*) from u', kwtest.get('user:onb.member@example.com')))::int, 0, 'nobody edits someone else''s profile');
select kwtest.throws('update public.profiles set email = ''x@example.com'' where id = auth.uid()', 'permission denied', 'email can''t be changed through the profile');

-- Organization rename
select kwtest.lives(format('select public.rename_organization(%L, ''Renamed Org'')', kwtest.get('org')), 'owners rename their organization');
select kwtest.eq((select name from public.organizations where id = kwtest.uuid('org')), 'Renamed Org', 'the new name is saved');
select kwtest.throws(format('select public.rename_organization(%L, '''')', kwtest.get('org')), '1-80 characters', 'empty names are refused');
select kwtest.login('onb.member@example.com');
select kwtest.throws(format('select public.rename_organization(%L, ''Mine'')', kwtest.get('org')), 'org.manage', 'members can''t rename the organization');
reset role;
select kwtest.ok(exists (select 1 from public.audit_events where action = 'org.renamed' and target_id = kwtest.get('org') and metadata ->> 'from' = 'Onboarding Org'), 'renames are audited with the old name');
