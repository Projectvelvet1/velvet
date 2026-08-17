-- ============================================================================
-- PROJECT VELVET  Let any member of a client (agency OR client side) create and
-- assign tasks for that client. Personal (no-client) tasks stay agency-only.
-- Run ONCE in Supabase. Safe to re-run.
-- ============================================================================

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (
  created_by = auth.uid() and (
    public.is_super_admin()
    or (workspace_id is not null and public.is_member_of(workspace_id))
    or (workspace_id is null and public.is_agency())
  ));

-- read/update already allow assignee, creator, workspace members and super admin,
-- so a client user can see and manage tasks on their own client. Re-assert read to be safe:
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select using (
  assignee_id = auth.uid() or created_by = auth.uid()
  or (workspace_id is not null and public.is_member_of(workspace_id))
  or public.is_super_admin());
