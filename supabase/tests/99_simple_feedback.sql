-- Simple Mode feedback: only the server writes it; only staff read it.
select kwtest.file(:'kwfile');

select kwtest.mk_user('sf.staff@example.com');
select kwtest.mk_user('sf.customer@example.com');
insert into public.platform_admins(user_id, role) values (kwtest.uuid('user:sf.staff@example.com'), 'support');

reset role;
insert into public.simple_feedback(page_key, helpful, note) values ('tab:secrets', false, 'Which name do I type?'), ('integrations', true, null);
select kwtest.throws($$insert into public.simple_feedback(page_key, helpful) values ('', true)$$, 'check', 'a page is required');
select kwtest.throws(format('insert into public.simple_feedback(page_key, helpful, note) values (%L, true, %L)', 'x', repeat('a', 501)), 'check', 'notes are capped');

select kwtest.login('sf.customer@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.simple_feedback)::int, 0, 'customers can''t read anyone''s feedback');
select kwtest.throws($$insert into public.simple_feedback(page_key, helpful) values ('x', true)$$, 'permission denied', 'customers can''t write directly');

select kwtest.login('sf.staff@example.com');
set role authenticated;
select kwtest.eq((select count(*) from public.simple_feedback)::int, 2, 'staff read feedback');

reset role;
set role anon;
select kwtest.throws($$select count(*) from public.simple_feedback$$, 'permission denied', 'anonymous visitors can''t read it');
reset role;
