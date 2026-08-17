-- ============================================================================
-- PROJECT VELVET  Set up an SEO team-member test account.
-- FIRST create the login (see steps in chat), THEN run this in SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- 1) Make them an agency SEO specialist (works whether or not the profile
--    was auto-created; keyed off the auth user).
insert into public.profiles (id, email, side, home_department, job_title, full_name)
select u.id, u.email, 'agency', 'performance', 'SEO Specialist', 'SEO Test'
from auth.users u
where u.email = 'seotest2@welcometomorrow.io'
on conflict (id) do update
  set side = 'agency', home_department = 'performance',
      job_title = 'SEO Specialist',
      full_name = coalesce(public.profiles.full_name, 'SEO Test');

-- 2) Assign them to SEO on every client that bought SEO (so their dashboard
--    has clients), and give them access (membership).
insert into public.service_assignments (workspace_id, service_key, profile_id)
select cs.workspace_id, 'seo', p.id
from public.client_services cs
join public.profiles p on p.email = 'seotest2@welcometomorrow.io'
where cs.service_key = 'seo'
  and not exists (
    select 1 from public.service_assignments sa
    where sa.workspace_id = cs.workspace_id and sa.service_key = 'seo' and sa.profile_id = p.id);

insert into public.memberships (profile_id, workspace_id)
select p.id, cs.workspace_id
from public.client_services cs
join public.profiles p on p.email = 'seotest2@welcometomorrow.io'
where cs.service_key = 'seo'
  and not exists (
    select 1 from public.memberships m
    where m.workspace_id = cs.workspace_id and m.profile_id = p.id);

-- 3) CONFIRM: what SEO clients is the test account now on?
select w.name as seo_client
from public.service_assignments sa
join public.profiles p on p.id = sa.profile_id
join public.workspaces w on w.id = sa.workspace_id
where p.email = 'seotest2@welcometomorrow.io' and sa.service_key = 'seo';
