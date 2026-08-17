-- ============================================================================
-- PROJECT VELVET  Give each team member a specific service (not just a dept),
-- so client-service assignment can show only the right people. Run ONCE.
-- ============================================================================
alter table public.profiles add column if not exists home_service text;
