-- ============================================================================
-- PROJECT VELVET  Scoped onboarding forms. One DEFAULT form drives all future
-- onboards; a per-client row overrides it for that client only. If neither
-- exists, the app falls back to the built-in intake form. Run ONCE. Safe to re-run.
-- ============================================================================
create table if not exists public.onboarding_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,  -- NULL = default (all future onboards)
  definition jsonb not null,
  updated_by uuid,
  updated_at timestamptz default now()
);
-- exactly one row per scope target (one default; one per client)
create unique index if not exists onboarding_forms_scope
  on public.onboarding_forms ((coalesce(workspace_id::text, 'default')));

alter table public.onboarding_forms enable row level security;

-- read: any agency member, or a member of that client, or the default (null ws)
drop policy if exists of_read on public.onboarding_forms;
create policy of_read on public.onboarding_forms for select using (
  public.is_super_admin() or public.is_agency()
  or workspace_id is null
  or (workspace_id is not null and public.is_member_of(workspace_id))
);

-- write: super admin only (the server also guards this)
drop policy if exists of_write on public.onboarding_forms;
create policy of_write on public.onboarding_forms for all
  using (public.is_super_admin()) with check (public.is_super_admin());
