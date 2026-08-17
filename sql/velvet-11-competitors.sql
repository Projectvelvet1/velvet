-- ============================================================================
-- PROJECT VELVET  Competitors (SEO workspace). The team adds competitors per
-- client; they show on the dashboard and feed the Compare panel.
-- Client-side read/write under RLS (no API route). Run ONCE in Supabase.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.competitors (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  service_key  text not null default 'seo',
  name         text not null,
  created_at   timestamptz not null default now()
);

alter table public.competitors enable row level security;

-- READ: anyone who can see the client (members incl. the client, or super admin)
drop policy if exists comp_read on public.competitors;
create policy comp_read on public.competitors
  for select using (public.is_member_of(workspace_id) or public.is_super_admin());

-- ADD: agency people on the client, or super admin (clients don't add competitors)
drop policy if exists comp_insert on public.competitors;
create policy comp_insert on public.competitors
  for insert with check (public.is_agency() and (public.is_member_of(workspace_id) or public.is_super_admin()));

-- REMOVE: same as add
drop policy if exists comp_delete on public.competitors;
create policy comp_delete on public.competitors
  for delete using (public.is_agency() and (public.is_member_of(workspace_id) or public.is_super_admin()));
