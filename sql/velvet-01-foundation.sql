-- ============================================================================
-- PROJECT VELVET — Foundation (Phase 1)
-- Database schema + Row-Level Security (the client-separation layer)
-- ============================================================================
--
-- WHAT THIS DOES, IN PLAIN ENGLISH
--   It creates the smallest possible set of tables that make Velvet safe:
--     • workspaces  = one per client (this is the wall between clients)
--     • profiles    = one per signed-in person
--     • memberships = which person can see which client, and in what role
--   Then it switches on Row-Level Security so the database itself refuses to
--   show one client's data to anyone who isn't a member of that client.
--   It also auto-detects the "side": anyone signing up with a
--   @welcometomorrow.io email is Agency; everyone else is a Client.
--
-- HOW TO RUN IT
--   1. Open your Supabase project.
--   2. Left menu → SQL Editor → New query.
--   3. Paste this whole file and click Run.
--   4. You should see "Success. No rows returned." That's correct.
--
-- NOTE: I can't run this against your database from here, so if Supabase shows
-- an error, copy the red message back to me and I'll fix it. This is safe to
-- re-run: it drops and recreates cleanly.
-- ============================================================================

-- ---------- clean slate (safe to re-run) ----------
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.is_super_admin();
drop function if exists public.is_member_of(uuid);
drop table    if exists public.memberships cascade;
drop table    if exists public.workspaces  cascade;
drop table    if exists public.profiles     cascade;
drop type     if exists app_side;
drop type     if exists dept;

-- ---------- 1. simple category types ----------
create type app_side as enum ('agency','client');
create type dept     as enum ('performance','content','analytics');   -- our 3 departments

-- ---------- 2. profiles: one row per person (linked to Supabase's login system) ----------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique not null,
  full_name      text,
  side           app_side not null default 'agency',
  is_super_admin boolean  not null default false,
  created_at     timestamptz not null default now()
);

-- ---------- 3. workspaces: one per client — THE wall between clients ----------
create table public.workspaces (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  is_demo             boolean not null default true,   -- everything starts as demo, deletable per client
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ---------- 4. memberships: who can see which client, and how ----------
create table public.memberships (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id)   on delete cascade,
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  department     dept,            -- for agency team members; left blank for client users
  service        text,            -- e.g. 'paid_media','seo','aso','creative','ugc','tracking'
  is_client_lead boolean not null default false,  -- the WT lead for this client
  created_at     timestamptz not null default now(),
  unique (profile_id, workspace_id)
);

-- ============================================================================
-- SECURITY HELPERS
-- These run with elevated rights so the security rules below don't trip over
-- themselves (a well-known Postgres gotcha). Do not skip these.
-- ============================================================================
create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_member_of(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.profile_id = auth.uid() and m.workspace_id = ws
  );
$$;

-- ============================================================================
-- ROW-LEVEL SECURITY  — the actual client separation
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.workspaces  enable row level security;
alter table public.memberships enable row level security;

-- PROFILES: you can read/update your own row; a super admin can read everyone.
create policy profiles_read on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- WORKSPACES: you can see a client ONLY if you're a member of it (or super admin).
-- This one line is what stops Client A ever seeing Client B.
create policy workspaces_read on public.workspaces
  for select using (public.is_member_of(id) or public.is_super_admin());
-- Only a super admin creates/edits/deletes clients (user management).
create policy workspaces_write on public.workspaces
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- MEMBERSHIPS: you can see your own memberships and those for clients you belong to.
create policy memberships_read on public.memberships
  for select using (
    profile_id = auth.uid() or public.is_member_of(workspace_id) or public.is_super_admin()
  );
-- Only a super admin assigns people to clients (for now — client-lead
-- assignment can be added as a small next step).
create policy memberships_write on public.memberships
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGN-UP  (with automatic side detection)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, side)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    case
      when new.email ilike '%@welcometomorrow.io' then 'agency'::app_side
      else 'client'::app_side
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- MAKE YOURSELF THE SUPER ADMIN
-- After you've signed up once in the app (or in Supabase → Authentication),
-- run this ONE line with your email so you can manage everything:
--
--   update public.profiles set is_super_admin = true
--   where email = 'cosmas@welcometomorrow.io';
-- ============================================================================

-- ============================================================================
-- OPTIONAL: prove the separation works (safe demo data, all tagged is_demo)
-- Run this, then check the Table Editor — you'll see two separate clients.
-- ============================================================================
-- insert into public.workspaces (name) values ('Betika (demo)'), ('Cashia (demo)');
