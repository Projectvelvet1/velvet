-- ============================================================================
-- PROJECT VELVET  Customer Action Plan: tasks (agency side, stage 1)
-- Light task model per the blueprint: To do -> In progress -> Delivered, then
-- (later, client side) Reviewed / Needs another look. Per service, per client.
-- Client-side read/write under RLS (no API route). Run ONCE. Safe to re-run.
-- ============================================================================

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  service_key   text not null,
  title         text not null,
  status        text not null default 'todo',   -- todo | in_progress | delivered | reviewed | needs_look
  assignee_id   uuid references public.profiles(id),
  client_note   text,                            -- filled later by the client on "needs another look"
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tasks_ws_svc on public.tasks (workspace_id, service_key);

alter table public.tasks enable row level security;

-- READ: anyone who can see the client (agency members incl. the client, or super admin)
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
  for select using (public.is_member_of(workspace_id) or public.is_super_admin());

-- ADD / EDIT: agency people on the client, or super admin (clients don't create tasks here)
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (public.is_agency() and (public.is_member_of(workspace_id) or public.is_super_admin()));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (public.is_agency() and (public.is_member_of(workspace_id) or public.is_super_admin()))
  with check (public.is_agency() and (public.is_member_of(workspace_id) or public.is_super_admin()));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (public.is_agency() and (public.is_member_of(workspace_id) or public.is_super_admin()));
