-- ============================================================================
-- PROJECT VELVET  Client details: website, industry, start date, lead name
-- Small additions to the client record. Website + industry are captured at
-- prospect stage and carry over on conversion (same workspace). Start date is
-- set at conversion / on the client. Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.workspaces add column if not exists website     text;
alter table public.workspaces add column if not exists industry    text;
alter table public.workspaces add column if not exists start_date  date;
alter table public.workspaces add column if not exists lead_name   text;   -- client lead's name
