-- ============================================================================
-- PROJECT VELVET  Let super admins & a client's project lead UPDATE the client
-- record directly (website, industry, start date, lead name, health, upsell,
-- notes). This lets the app save details client-side reliably, with no API
-- route in the way. Run ONCE in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

drop policy if exists ws_update_admin_or_lead on public.workspaces;
create policy ws_update_admin_or_lead on public.workspaces
  for update
  using (public.is_super_admin() or project_lead_id = auth.uid())
  with check (public.is_super_admin() or project_lead_id = auth.uid());
