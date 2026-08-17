-- ============================================================================
-- PROJECT VELVET  Fix: clients who completed full onboarding but weren't marked
-- Run in Supabase -> SQL Editor.
-- ============================================================================

-- 1) LOOK FIRST: signed clients whose onboarding_complete is still false,
--    but who already have 'full' onboarding answers saved (i.e. they submitted).
select w.id, w.name, w.phase, w.onboarding_complete,
       count(r.*) as full_answers
from public.workspaces w
left join public.onboarding_responses r
  on r.workspace_id = w.id and r.phase = 'full'
where w.phase = 'signed' and coalesce(w.onboarding_complete, false) = false
group by w.id, w.name, w.phase, w.onboarding_complete
order by full_answers desc;

-- 2) FIX (safe): mark complete any signed client who actually has full answers.
update public.workspaces w
set onboarding_complete = true
where w.phase = 'signed'
  and coalesce(w.onboarding_complete, false) = false
  and exists (select 1 from public.onboarding_responses r
              where r.workspace_id = w.id and r.phase = 'full');

-- 3) OR fix one client by name (uncomment and set the name):
-- update public.workspaces set onboarding_complete = true where name = 'PUT CLIENT NAME HERE';
