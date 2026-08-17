-- ============================================================================
-- PROJECT VELVET  Stage A: agency team profile fields
-- Adds job title + home department to a person's profile, and lets any signed-in
-- agency user read the agency team directory (names/titles), while still keeping
-- client data separated.
-- Run in Supabase -> SQL Editor -> New query -> Run. Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists home_department dept;

-- Agency users may read other AGENCY profiles (for the Team directory + pickers).
-- Clients still only ever read their own profile (existing policy stays).
drop policy if exists profiles_agency_directory on public.profiles;
create policy profiles_agency_directory on public.profiles
  for select using (
    side = 'agency'
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.side = 'agency'
    )
  );
