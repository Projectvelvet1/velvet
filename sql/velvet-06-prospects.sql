-- ============================================================================
-- PROJECT VELVET  Prospect funnel + discovery onboarding
-- Adds a client "phase" (prospect -> signed -> active), a discovery-complete
-- flag, and a table to store onboarding answers. Run in Supabase -> SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- 1) phase on each client. Existing clients default to 'signed'.
alter table public.workspaces add column if not exists phase text not null default 'signed';
alter table public.workspaces add column if not exists discovery_complete boolean not null default false;

-- 2) onboarding answers (works for both the discovery and the full onboarding)
drop table if exists public.onboarding_responses cascade;
create table public.onboarding_responses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  phase        text not null,               -- 'discovery' or 'full'
  question_key text not null,
  answer       text,
  updated_at   timestamptz not null default now(),
  unique (workspace_id, phase, question_key)
);

alter table public.onboarding_responses enable row level security;

-- a member of the client (or super admin) can read + write that client's answers
create policy onb_read   on public.onboarding_responses
  for select using (public.is_member_of(workspace_id) or public.is_super_admin());
create policy onb_insert on public.onboarding_responses
  for insert with check (public.is_member_of(workspace_id) or public.is_super_admin());
create policy onb_update on public.onboarding_responses
  for update using (public.is_member_of(workspace_id) or public.is_super_admin());
