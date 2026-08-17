-- ============================================================================
-- PROJECT VELVET  Let super admins & a client's project lead manage service
-- assignments and edit teammates, all client-side (no API route). Run ONCE.
-- Safe to re-run.
-- ============================================================================

-- ---- service_assignments: super admin or the client's project lead may add/remove ----
alter table public.service_assignments enable row level security;

drop policy if exists sa_read on public.service_assignments;
create policy sa_read on public.service_assignments
  for select using (public.is_agency());

drop policy if exists sa_insert on public.service_assignments;
create policy sa_insert on public.service_assignments
  for insert with check (
    public.is_super_admin()
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.project_lead_id = auth.uid())
  );

drop policy if exists sa_delete on public.service_assignments;
create policy sa_delete on public.service_assignments
  for delete using (
    public.is_super_admin()
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.project_lead_id = auth.uid())
  );

-- ---- memberships: super admin or project lead may add a member (so an assignee
--      can also be granted access to the client). Kept permissive to agency leads. ----
alter table public.memberships enable row level security;
drop policy if exists mem_write_admin_lead on public.memberships;
create policy mem_write_admin_lead on public.memberships
  for insert with check (
    public.is_super_admin()
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.project_lead_id = auth.uid())
  );

-- ---- profiles: super admin may edit any agency teammate's details ----
drop policy if exists prof_update_superadmin on public.profiles;
create policy prof_update_superadmin on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());
