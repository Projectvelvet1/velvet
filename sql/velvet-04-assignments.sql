-- ============================================================================
-- PROJECT VELVET  Stage B-1: project lead + team-by-service assignment
-- Adds who the agency project lead is for each client, and which teammates
-- handle each service for that client (many people allowed per service).
-- Run in Supabase -> SQL Editor -> New query -> Run. Safe to re-run.
-- ============================================================================

-- 1) project lead lives on the workspace (one agency owner per client)
alter table public.workspaces add column if not exists project_lead_id uuid references public.profiles(id);

-- 2) which teammates handle which service for a client (many-to-many)
drop table if exists public.service_assignments cascade;
create table public.service_assignments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id)   on delete cascade,
  service_key  text not null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, profile_id, service_key)
);

alter table public.service_assignments enable row level security;

-- a person can read assignments for a client they can see
create policy service_assignments_read on public.service_assignments
  for select using (public.is_member_of(workspace_id) or public.is_super_admin());
-- writes happen server-side (service_role) after verifying super admin, so no
-- browser write policy is needed.

-- 3) when someone is assigned to a client (lead or service), they should also
--    be a member of that workspace so RLS lets them see it. The server handles
--    inserting those membership rows.
