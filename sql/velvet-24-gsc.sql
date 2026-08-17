-- ============================================================================
-- PROJECT VELVET  Google Search Console: one agency-wide connection, plus a
-- per-client property match. Tokens are server-only (RLS locked; the server
-- uses the service role). Run ONCE. Safe to re-run.
-- ============================================================================

-- one agency-wide Google connection (singleton row id=1)
create table if not exists public.gsc_connection (
  id int primary key default 1,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  google_email text,
  connected_by uuid,
  updated_at timestamptz default now(),
  constraint gsc_singleton check (id = 1)
);
alter table public.gsc_connection enable row level security;  -- no policies: server-only

-- short-lived CSRF state for the OAuth handshake
create table if not exists public.gsc_oauth_state (
  state text primary key,
  profile_id uuid,
  created_at timestamptz default now()
);
alter table public.gsc_oauth_state enable row level security;  -- no policies: server-only

-- which GSC property belongs to which client
create table if not exists public.client_gsc_property (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  property text not null,
  set_by uuid,
  updated_at timestamptz default now()
);
alter table public.client_gsc_property enable row level security;

drop policy if exists cgp_read on public.client_gsc_property;
create policy cgp_read on public.client_gsc_property for select
  using (public.is_member_of(workspace_id) or public.is_super_admin());

drop policy if exists cgp_write on public.client_gsc_property;
create policy cgp_write on public.client_gsc_property for insert
  with check (public.is_super_admin() or (public.is_agency() and public.is_member_of(workspace_id)));

drop policy if exists cgp_update on public.client_gsc_property;
create policy cgp_update on public.client_gsc_property for update
  using (public.is_super_admin() or (public.is_agency() and public.is_member_of(workspace_id)));
