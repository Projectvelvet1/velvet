-- ============================================================================
-- PROJECT VELVET  Ask Velvet per-service training + declared data sources.
-- A list of items per service. kind 'note' = training/style guidance;
-- kind 'source' = a declared data source (content = source key).
-- Any agency member can add or remove. Run ONCE. Safe to re-run.
-- ============================================================================
create table if not exists public.service_guidance (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  kind text not null default 'note',
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz default now()
);
alter table public.service_guidance enable row level security;

drop policy if exists sg_read on public.service_guidance;
create policy sg_read on public.service_guidance for select using (public.is_agency() or public.is_super_admin());

drop policy if exists sg_insert on public.service_guidance;
create policy sg_insert on public.service_guidance for insert with check ((public.is_agency() or public.is_super_admin()) and created_by = auth.uid());

drop policy if exists sg_delete on public.service_guidance;
create policy sg_delete on public.service_guidance for delete using (public.is_agency() or public.is_super_admin());
