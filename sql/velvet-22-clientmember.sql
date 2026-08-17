-- ============================================================================
-- PROJECT VELVET  Add clientmember@gmail.com as a CLIENT-SIDE teammate on
-- "Client Test", handling SEO. Same access as the client lead (equal privileges).
-- Auth user must already exist in Supabase. Run ONCE. Safe to re-run.
-- ============================================================================
do $$
declare ws_id uuid; mem_id uuid;
begin
  select id into ws_id from public.workspaces where name = 'Client Test' limit 1;
  select id into mem_id from auth.users where email = 'clientmember@gmail.com' limit 1;
  if ws_id is null then raise notice 'Client Test not found'; return; end if;
  if mem_id is null then raise notice 'clientmember@gmail.com not found in auth.users'; return; end if;

  -- 1) profile: client side
  insert into public.profiles (id, email, side)
  values (mem_id, 'clientmember@gmail.com', 'client')
  on conflict (id) do update set side = 'client';

  -- 2) membership on Client Test, handling SEO, NOT the lead (equal access anyway)
  insert into public.memberships (profile_id, workspace_id, is_client_lead, client_service)
  values (mem_id, ws_id, false, 'seo')
  on conflict (profile_id, workspace_id)
    do update set client_service = 'seo';
end $$;
