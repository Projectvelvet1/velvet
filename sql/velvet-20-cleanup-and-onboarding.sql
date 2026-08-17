-- ============================================================================
-- PROJECT VELVET  (1) remove the Acme demo client, (2) make onboarding-complete
-- flip reliably at the DATABASE level so new clients never get stuck, (3) unstick
-- Client Test. Run ONCE in Supabase. Safe to re-run.
-- ============================================================================

-- 1) Remove "Acme (all services)" and all its child rows.
do $$
declare a uuid;
begin
  select id into a from public.workspaces where name = 'Acme (all services)' limit 1;
  if a is not null then
    delete from public.service_assignments where workspace_id = a;
    delete from public.memberships          where workspace_id = a;
    delete from public.client_services      where workspace_id = a;
    delete from public.onboarding_responses where workspace_id = a;
    delete from public.tasks                where workspace_id = a;
    delete from public.competitors          where workspace_id = a;
    delete from public.feedback_service_scores where submission_id in (select id from public.feedback_submissions where workspace_id = a);
    delete from public.feedback_answers        where submission_id in (select id from public.feedback_submissions where workspace_id = a);
    delete from public.feedback_submissions where workspace_id = a;
    delete from public.workspaces where id = a;
  end if;
end $$;

-- 2) PERMANENT onboarding-complete fix (DB trigger). When onboarding answers are
--    saved, the right flag flips automatically, with no dependence on app code.
create or replace function public.mark_onboarding_from_answers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.phase = 'full' then
    update public.workspaces set onboarding_complete = true where id = NEW.workspace_id;
  elsif NEW.phase = 'discovery' then
    update public.workspaces set discovery_complete = true where id = NEW.workspace_id;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_mark_onboarding on public.onboarding_responses;
create trigger trg_mark_onboarding
  after insert or update on public.onboarding_responses
  for each row execute function public.mark_onboarding_from_answers();

-- 3) BACKFILL: any signed client that already has 'full' answers becomes complete.
update public.workspaces w set onboarding_complete = true
where coalesce(w.onboarding_complete, false) = false
  and exists (select 1 from public.onboarding_responses r where r.workspace_id = w.id and r.phase = 'full');

update public.workspaces w set discovery_complete = true
where coalesce(w.discovery_complete, false) = false
  and exists (select 1 from public.onboarding_responses r where r.workspace_id = w.id and r.phase = 'discovery');

-- 4) Unstick "Client Test" (you confirmed it finished onboarding).
update public.workspaces set onboarding_complete = true
where name = 'Client Test' and phase = 'signed';

-- 5) CONFIRM: signed vs active after the fix.
select count(*) filter (where phase='signed') as signed_clients,
       count(*) filter (where phase='signed' and onboarding_complete) as active_clients
from public.workspaces;
