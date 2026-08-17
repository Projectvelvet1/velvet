-- ============================================================================
-- PROJECT VELVET  Stage 2: onboarding questions in the database
-- Moves the onboarding questions out of code so a super admin can add/edit/
-- delete them from the app. One shared set per type (discovery + full).
-- Run in Supabase -> SQL Editor. Safe to re-run (seeds use ON CONFLICT DO NOTHING).
-- ============================================================================

create table if not exists public.onboarding_questions (
  id           uuid primary key default gen_random_uuid(),
  phase        text not null,                 -- 'discovery' or 'full'
  question_key text not null,                 -- stable key that answers link to
  label        text not null,
  helper       text default '',
  answer_type  text not null default 'text',  -- 'text' or 'textarea'
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  unique (phase, question_key)
);

alter table public.onboarding_questions enable row level security;

-- Anyone signed in may READ questions (clients need them to fill the form).
drop policy if exists oq_read on public.onboarding_questions;
create policy oq_read on public.onboarding_questions
  for select using (auth.uid() is not null);
-- Writes happen server-side (service_role) after verifying super admin.

-- ---- seed the current placeholder questions (only if not already present) ----
insert into public.onboarding_questions (phase, question_key, label, helper, answer_type, sort_order) values
  ('discovery','company_name','Company name','Your brand as customers know it.','text',1),
  ('discovery','what_you_do','What does your business do?','A sentence or two is fine.','textarea',2),
  ('discovery','main_problem','Your single biggest marketing challenge right now?','','textarea',3),
  ('discovery','tried_before','What have you already tried?','','textarea',4),
  ('discovery','goal_6m','What would success look like in 6 months?','','textarea',5),
  ('discovery','timeline','When would you like to start?','','text',6),
  ('full','full_company_name','Company name','','text',1),
  ('full','value_prop','What is your value proposition, and for which audience?','','textarea',2),
  ('full','priority_offer','Which product/service should we prioritise?','','textarea',3),
  ('full','target_audience','Who are your main target customers?','','textarea',4),
  ('full','channels','Which channels do you use today?','','textarea',5)
on conflict (phase, question_key) do nothing;
