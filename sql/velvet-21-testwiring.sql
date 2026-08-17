-- ============================================================================
-- PROJECT VELVET  Make the service test accounts behave as pure team members,
-- and wire them (+ the client) onto "Client Test". Run ONCE. Safe to re-run.
-- ============================================================================

-- 1) No service account should be a project lead (that role grants all-departments
--    + the admin dashboard). Move any such lead to a super admin (Cosmas).
update public.workspaces w
set project_lead_id = (select id from public.profiles where email='cosmas@welcometomorrow.io' limit 1)
where w.project_lead_id in (
  select id from public.profiles where email in (
    'seo@welcometomorrow.io','paid@welcometomorrow.io','aso@welcometomorrow.io',
    'creative@welcometomorrow.io','asset@welcometomorrow.io','ugc@welcometomorrow.io',
    'dashboarding@welcometomorrow.io','analytics@welcometomorrow.io'));

-- 2) Assign each service account to Client Test's services (only services it has),
--    give them membership, and set client@gmail.com as the client lead.
do $$
declare ws_id uuid; client_id uuid; acct record;
begin
  select id into ws_id from public.workspaces where name='Client Test' limit 1;
  if ws_id is null then raise notice 'Client Test not found'; return; end if;
  select id into client_id from public.profiles where email='client@gmail.com' limit 1;

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
    if exists (select 1 from public.client_services cs where cs.workspace_id=ws_id and cs.service_key=acct.svc) then
      insert into public.service_assignments (workspace_id, profile_id, service_key)
      select ws_id, acct.pid, acct.svc
      where not exists (select 1 from public.service_assignments sa where sa.workspace_id=ws_id and sa.profile_id=acct.pid and sa.service_key=acct.svc);
      insert into public.memberships (profile_id, workspace_id, is_client_lead)
      values (acct.pid, ws_id, false) on conflict (profile_id, workspace_id) do nothing;
    end if;
  end loop;

  if client_id is not null then
    insert into public.memberships (profile_id, workspace_id, is_client_lead)
    values (client_id, ws_id, true)
    on conflict (profile_id, workspace_id) do update set is_client_lead=true;
  end if;
end $$;
