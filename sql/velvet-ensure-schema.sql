-- ============================================================================
-- PROJECT VELVET  Ensure all columns & tables exist (idempotent, safe to re-run)
-- If client details / onboarding weren't persisting, the most common cause is a
-- migration that was never run. This creates anything missing without touching
-- existing data. Run in Supabase -> SQL Editor.
-- ============================================================================

-- 1) DIAGNOSTIC: see which columns your workspaces table actually has.
--    (Look for: phase, onboarding_complete, discovery_complete, website,
--     industry, start_date, lead_name, health, upsell, notes)
select column_name from information_schema.columns
where table_schema='public' and table_name='workspaces'
order by column_name;

-- 2) ENSURE the workspace columns exist
alter table public.workspaces add column if not exists phase              text default 'signed';
alter table public.workspaces add column if not exists discovery_complete boolean default false;
alter table public.workspaces add column if not exists onboarding_complete boolean default false;
alter table public.workspaces add column if not exists website            text;
alter table public.workspaces add column if not exists industry           text;
alter table public.workspaces add column if not exists start_date         date;
alter table public.workspaces add column if not exists lead_name          text;
alter table public.workspaces add column if not exists health             text default 'healthy';
alter table public.workspaces add column if not exists upsell             text;
alter table public.workspaces add column if not exists notes              text;

-- 3) ENSURE onboarding_responses exists with the right shape + RLS
create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  phase text not null,
  question_key text not null,
  answer text,
  updated_at timestamptz default now(),
  unique (workspace_id, phase, question_key)
);
alter table public.onboarding_responses enable row level security;
drop policy if exists onb_rw on public.onboarding_responses;
create policy onb_rw on public.onboarding_responses
  for all using (public.is_member_of(workspace_id) or public.is_super_admin())
  with check (public.is_member_of(workspace_id) or public.is_super_admin());

-- 4) CONFIRM after running section 2: values should now persist from the app.
