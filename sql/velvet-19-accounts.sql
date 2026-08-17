-- ============================================================================
-- PROJECT VELVET  Wire the real agency + client accounts (auth users already
-- created in Supabase). RUN velvet-18 FIRST. Safe to re-run (idempotent).
-- NOTE: home_department and client_services.department are the enum type "dept",
-- so text values from the VALUES lists are cast with ::dept.
-- ============================================================================

-- 1) super admins
insert into public.profiles (id, email, side, is_super_admin)
select u.id, u.email, 'agency', true
from auth.users u
where u.email in ('cosmas@welcometomorrow.io','maxime@welcometomorrow.io','brian@welcometomorrow.io')
on conflict (id) do update set side = 'agency', is_super_admin = true;

-- 2) service team members (department [enum] + service [text])
insert into public.profiles (id, email, side, is_super_admin, home_department, home_service)
select u.id, u.email, 'agency', false, m.dept::dept, m.svc
from (values
  ('seo@welcometomorrow.io','performance','seo'),
  ('paid@welcometomorrow.io','performance','paid_media'),
  ('aso@welcometomorrow.io','performance','aso'),
  ('creative@welcometomorrow.io','content','creative_strategy'),
  ('asset@welcometomorrow.io','content','asset_production'),
  ('ugc@welcometomorrow.io','content','ugc'),
  ('dashboarding@welcometomorrow.io','analytics','dashboarding'),
  ('analytics@welcometomorrow.io','analytics','tracking')
) as m(email,dept,svc)
join auth.users u on u.email = m.email
on conflict (id) do update set side='agency', is_super_admin=false,
  home_department=excluded.home_department, home_service=excluded.home_service;

-- 3) the test client
insert into public.profiles (id, email, side)
select u.id, u.email, 'client' from auth.users u where u.email = 'client@gmail.com'
on conflict (id) do update set side = 'client';

-- 4) one signed client with ALL services, and assign each service member to it
do $$
declare lead_id uuid; ws_id uuid; client_id uuid; acct record;
begin
  select id into lead_id from public.profiles where email='cosmas@welcometomorrow.io' limit 1;
  select id into client_id from public.profiles where email='client@gmail.com' limit 1;

  select id into ws_id from public.workspaces where name='Acme (all services)' limit 1;
  if ws_id is null then
    insert into public.workspaces (name, phase, is_demo, onboarding_complete, project_lead_id)
    values ('Acme (all services)','signed', true, true, lead_id) returning id into ws_id;
  else
    update public.workspaces set phase='signed', onboarding_complete=true,
      project_lead_id=coalesce(project_lead_id, lead_id) where id=ws_id;
  end if;

  insert into public.client_services (workspace_id, department, service_key, service_label)
  select ws_id, x.dept::dept, x.svc, x.label from (values
    ('performance','seo','SEO'),
    ('performance','paid_media','Paid Media'),
    ('performance','aso','ASO'),
    ('content','creative_strategy','Creative Strategy'),
    ('content','asset_production','Asset Production'),
    ('content','ugc','UGC'),
    ('analytics','tracking','Tracking'),
    ('analytics','dashboarding','Dashboarding')
  ) as x(dept,svc,label)
  where not exists (select 1 from public.client_services cs where cs.workspace_id=ws_id and cs.service_key=x.svc);

  if client_id is not null then
    insert into public.memberships (profile_id, workspace_id, is_client_lead)
    values (client_id, ws_id, true)
    on conflict (profile_id, workspace_id) do update set is_client_lead = true;
  end if;

  for acct in
    select u.id as pid, m.svc from (values
      ('seo@welcometomorrow.io','seo'),
      ('paid@welcometomorrow.io','paid_media'),
      ('aso@welcometomorrow.io','aso'),
      ('creative@welcometomorrow.io','creative_strategy'),
      ('asset@welcometomorrow.io','asset_production'),
      ('ugc@welcometomorrow.io','ugc'),
      ('dashboarding@welcometomorrow.io','dashboarding'),
      ('analytics@welcometomorrow.io','tracking')
    ) as m(email,svc) join auth.users u on u.email=m.email
  loop
    insert into public.service_assignments (workspace_id, profile_id, service_key)
    select ws_id, acct.pid, acct.svc
    where not exists (select 1 from public.service_assignments sa where sa.workspace_id=ws_id and sa.profile_id=acct.pid and sa.service_key=acct.svc);
    insert into public.memberships (profile_id, workspace_id, is_client_lead)
    values (acct.pid, ws_id, false) on conflict (profile_id, workspace_id) do nothing;
  end loop;
end $$;
