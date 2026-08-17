-- ============================================================================
-- PROJECT VELVET  PERMANENT onboarding-complete fix (database-level)
-- The database now marks a client complete the moment their onboarding answers
-- are saved. No app code is involved, so this can never get "stuck" again.
-- Run ONCE in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

-- 1) The function: when onboarding answers are saved, flip the right flag.
create or replace function public.mark_onboarding_from_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.phase = 'full' then
    update public.workspaces set onboarding_complete = true where id = NEW.workspace_id;
  elsif NEW.phase = 'discovery' then
    update public.workspaces set discovery_complete = true where id = NEW.workspace_id;
  end if;
  return NEW;
end;
$$;

-- 2) The trigger: fires whenever an answer row is inserted or updated.
drop trigger if exists trg_mark_onboarding on public.onboarding_responses;
create trigger trg_mark_onboarding
  after insert or update on public.onboarding_responses
  for each row execute function public.mark_onboarding_from_answers();

-- 3) BACKFILL: fix every client that is already stuck right now.
--    Any signed client with saved 'full' answers becomes onboarding-complete.
update public.workspaces w
set onboarding_complete = true
where coalesce(w.onboarding_complete, false) = false
  and exists (select 1 from public.onboarding_responses r
              where r.workspace_id = w.id and r.phase = 'full');

--    Any prospect with saved 'discovery' answers becomes discovery-complete.
update public.workspaces w
set discovery_complete = true
where coalesce(w.discovery_complete, false) = false
  and exists (select 1 from public.onboarding_responses r
              where r.workspace_id = w.id and r.phase = 'discovery');

-- 4) CONFIRM: how many clients are now active (signed + onboarding complete).
select
  count(*) filter (where phase='signed') as signed_clients,
  count(*) filter (where phase='signed' and onboarding_complete) as active_clients
from public.workspaces;
