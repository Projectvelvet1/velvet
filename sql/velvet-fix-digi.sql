-- ============================================================================
-- PROJECT VELVET  Make onboarded clients active (fixes Digi.com not showing)
-- Run in Supabase -> SQL Editor.
-- ============================================================================

-- 1) LOOK: what does Digi.com actually look like in the DB?
select id, name, phase, onboarding_complete, discovery_complete, start_date
from public.workspaces where name ilike '%digi%';

-- 2) LOOK: how many signed clients, and how many are onboarding-complete?
select
  count(*) filter (where phase='signed') as signed_clients,
  count(*) filter (where phase='signed' and onboarding_complete) as active_clients
from public.workspaces;

-- 3) FIX: mark complete any signed client that already has full onboarding answers
update public.workspaces w
set onboarding_complete = true
where w.phase = 'signed'
  and coalesce(w.onboarding_complete, false) = false
  and exists (select 1 from public.onboarding_responses r
              where r.workspace_id = w.id and r.phase = 'full');

-- 4) OR force just Digi.com active (uncomment if step 3 didn't catch it):
-- update public.workspaces set phase='signed', onboarding_complete = true where name ilike '%digi%';
