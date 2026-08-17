-- ============================================================================
-- PROJECT VELVET  Client-side team: record which service each client-side
-- teammate is responsible for. Run ONCE. Safe to re-run.
-- ============================================================================
alter table public.memberships add column if not exists client_service text;
