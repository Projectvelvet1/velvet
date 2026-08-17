-- ============================================================================
-- PROJECT VELVET  Per-service, per-client Documents. Each item is a name + a
-- pasted link, scoped to ONE client and ONE service. Agency adds/removes;
-- the client (and agency) can view. Run ONCE. Safe to re-run.
-- ============================================================================
create table if not exists public.service_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  service_key text not null,
  name text not null,
  url text not null,
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now()
);
create index if not exists sd_ws_svc on public.service_documents(workspace_id, service_key);

alter table public.service_documents enable row level security;

-- read: any member of the client (agency OR client side), or super admin
drop policy if exists sd_read on public.service_documents;
create policy sd_read on public.service_documents for select
  using (public.is_member_of(workspace_id) or public.is_super_admin());

-- add: an AGENCY member of that client, or super admin
drop policy if exists sd_insert on public.service_documents;
create policy sd_insert on public.service_documents for insert
  with check (public.is_super_admin() or (public.is_agency() and public.is_member_of(workspace_id)));

-- remove: same as add
drop policy if exists sd_delete on public.service_documents;
create policy sd_delete on public.service_documents for delete
  using (public.is_super_admin() or (public.is_agency() and public.is_member_of(workspace_id)));
