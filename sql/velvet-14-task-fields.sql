-- ============================================================================
-- PROJECT VELVET  Action Plan: richer task fields + self-assign visibility.
-- Adds priority, frequency, due date, deliverable link, description, share_with.
-- Lets people always see/manage tasks assigned to or created by them (personal
-- tasks), plus the existing per-client rules. Run ONCE. Safe to re-run.
-- ============================================================================

alter table public.tasks add column if not exists priority         text default 'medium';   -- low | medium | high | urgent
alter table public.tasks add column if not exists frequency        text default 'one_off';  -- one_off | weekly | monthly | quarterly
alter table public.tasks add column if not exists due_date         date;
alter table public.tasks add column if not exists deliverable_link text;
alter table public.tasks add column if not exists description      text;
alter table public.tasks add column if not exists share_with       text;

-- personal tasks may have no client
alter table public.tasks alter column workspace_id drop not null;
alter table public.tasks alter column service_key set default 'general';

-- RLS: you can always see & manage tasks assigned to you or created by you;
-- otherwise the per-client rules apply.
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select using (
  assignee_id = auth.uid() or created_by = auth.uid()
  or (workspace_id is not null and public.is_member_of(workspace_id))
  or public.is_super_admin());

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (
  public.is_agency() and created_by = auth.uid());

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update using (
  assignee_id = auth.uid() or created_by = auth.uid()
  or (workspace_id is not null and public.is_agency() and public.is_member_of(workspace_id))
  or public.is_super_admin()) with check (true);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (
  created_by = auth.uid() or public.is_super_admin()
  or (workspace_id is not null and public.is_agency() and public.is_member_of(workspace_id)));
