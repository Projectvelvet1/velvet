-- ============================================================================
-- PROJECT VELVET  Add the client columns the dashboard needs.
-- Your DB has 3 active clients, but the dashboard query references columns that
-- don't exist yet, so it errors and shows nothing. This adds them. Safe to re-run.
-- Run in Supabase -> SQL Editor, then just refresh the dashboard (no deploy needed).
-- ============================================================================

alter table public.workspaces add column if not exists health     text default 'healthy';
alter table public.workspaces add column if not exists upsell     text;
alter table public.workspaces add column if not exists notes      text;
alter table public.workspaces add column if not exists industry   text;
alter table public.workspaces add column if not exists website    text;
alter table public.workspaces add column if not exists start_date date;
alter table public.workspaces add column if not exists lead_name  text;

-- confirm they now exist:
select column_name from information_schema.columns
where table_schema='public' and table_name='workspaces'
  and column_name in ('health','upsell','notes','industry','website','start_date','lead_name')
order by column_name;
