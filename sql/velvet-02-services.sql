-- ============================================================================
-- PROJECT VELVET  Stage 1: client services
-- Adds one small table so each client can record the services they signed for.
-- Run this in Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run.
-- ============================================================================

-- fixed catalogue of departments + services (kept simple as text)
-- Performance: paid_media, seo, aso
-- Content:     creative_strategy, asset_production, ugc
-- Analytics:   tracking, dashboarding

drop table if exists public.client_services cascade;

create table public.client_services (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  department    dept not null,
  service_key   text not null,     -- e.g. 'seo', 'paid_media'
  service_label text not null,     -- e.g. 'SEO', 'Paid Media'
  created_at    timestamptz not null default now(),
  unique (workspace_id, service_key)
);

alter table public.client_services enable row level security;

-- a person can see a client's services only if they can see that client
create policy client_services_read on public.client_services
  for select using (
    public.is_member_of(workspace_id) or public.is_super_admin()
  );

-- only the server (service_role) writes these, after verifying super admin,
-- so no browser write policy is needed. (service_role bypasses RLS.)
