-- ============================================================================
-- PROJECT VELVET  Client meta: health status, upsell opportunities, notes
-- New fields for the super admin dashboard card. Editable by super admin, and
-- by the project lead for their own clients. Run in Supabase -> SQL Editor.
-- Safe to re-run.
-- ============================================================================

alter table public.workspaces add column if not exists health   text default 'healthy';  -- 'healthy' | 'watch' | 'risk'
alter table public.workspaces add column if not exists upsell    text;
alter table public.workspaces add column if not exists notes     text;
