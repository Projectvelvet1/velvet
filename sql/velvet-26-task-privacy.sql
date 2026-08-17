-- ============================================================================
-- PROJECT VELVET  Task privacy. A CLIENT must never read an agency member's
-- task. Clients see only tasks assigned to THEM (or that they created); the
-- CLIENT LEAD additionally sees tasks assigned to anyone on their client team.
-- Agency members keep full same-workspace visibility for collaboration.
-- Run ONCE. Safe to re-run.
-- ============================================================================

-- helper: is the caller the client lead of this workspace?
create or replace function public.is_client_lead_of(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.profile_id = auth.uid() and m.workspace_id = ws and m.is_client_lead
  );
$$;

-- rewrite the task READ policy
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select using (
  public.is_super_admin()
  or assignee_id = auth.uid()                                   -- a task assigned to me
  or created_by = auth.uid()                                    -- a task I created
  or (workspace_id is not null and public.is_agency() and public.is_member_of(workspace_id))  -- agency: full workspace view
  or (
    workspace_id is not null
    and public.is_client_lead_of(workspace_id)                  -- client lead: only their team's tasks
    and exists (select 1 from public.profiles p where p.id = tasks.assignee_id and p.side = 'client')
  )
);
