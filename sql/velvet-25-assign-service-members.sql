-- ============================================================================
-- PROJECT VELVET  Make the service team accounts MEMBERS of "Client Test" and
-- assign them to the matching service, so each sees the client under Clients.
-- (A team member sees a client only when THEY are assigned to it, not when the
-- client user is.) Run ONCE. Safe to re-run. Touches nothing else.
-- ============================================================================
do $$
declare ws_id uuid; acct record;
begin
  select id into ws_id from public.workspaces where name = 'Client Test' limit 1;
  if ws_id is null then raise notice 'Client Test not found'; return; end if;

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
    ) as m(email,svc) join auth.users u on u.email = m.email
  loop
    if exists (select 1 from public.client_services cs where cs.workspace_id = ws_id and cs.service_key = acct.svc) then
      insert into public.service_assignments (workspace_id, profile_id, service_key)
      select ws_id, acct.pid, acct.svc
      where not exists (select 1 from public.service_assignments sa where sa.workspace_id = ws_id and sa.profile_id = acct.pid and sa.service_key = acct.svc);
      insert into public.memberships (profile_id, workspace_id, is_client_lead)
      values (acct.pid, ws_id, false) on conflict (profile_id, workspace_id) do nothing;
    end if;
  end loop;
end $$;
