-- ============================================================================
-- PROJECT VELVET  FIX: profiles policy recursion (introduced in Stage A)
-- The Stage A "agency directory" policy queried profiles from inside a policy
-- ON profiles, which loops forever and makes ALL profile reads fail (so the app
-- couldn't read is_super_admin and showed everyone as "Team member").
-- This replaces it with a safe SECURITY DEFINER helper, matching the original
-- foundation pattern. Run in Supabase -> SQL Editor -> Run. Safe to re-run.
-- ============================================================================

-- safe helper: bypasses row-level security, so it does NOT recurse
create or replace function public.is_agency()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and side = 'agency');
$$;

-- replace the recursive policy with a non-recursive one
drop policy if exists profiles_agency_directory on public.profiles;
create policy profiles_agency_directory on public.profiles
  for select using ( side = 'agency' and public.is_agency() );

-- (your super-admin flag is already correct in the database; once this runs,
--  the app can read it again and you'll see "Super admin".)
