-- ============================================================================
-- PROJECT VELVET  Client feedback
-- Clients rate each bought service (1-10) + overall, and answer 3 questions.
-- Questions live in the DB (editable later). Run in Supabase -> SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- editable feedback questions (the 3 written ones)
create table if not exists public.feedback_questions (
  id           uuid primary key default gen_random_uuid(),
  question_key text unique not null,
  label        text not null,
  sort_order   int not null default 0
);
alter table public.feedback_questions enable row level security;
drop policy if exists fq_read on public.feedback_questions;
create policy fq_read on public.feedback_questions for select using (auth.uid() is not null);

insert into public.feedback_questions (question_key, label, sort_order) values
  ('why_rating','Why did you give these ratings?',1),
  ('improve','What do you think we need to improve on?',2),
  ('focus_service','Which service would you like us to focus on to give you confidence in us?',3)
on conflict (question_key) do nothing;

-- one feedback submission per client per date (many over time)
create table if not exists public.feedback_submissions (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  submitted_by   uuid references public.profiles(id),
  overall_score  int,
  created_at     timestamptz not null default now()
);
alter table public.feedback_submissions enable row level security;

-- per-service scores for a submission
create table if not exists public.feedback_service_scores (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.feedback_submissions(id) on delete cascade,
  service_key    text not null,
  score          int
);
alter table public.feedback_service_scores enable row level security;

-- answers to the written questions for a submission
create table if not exists public.feedback_answers (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.feedback_submissions(id) on delete cascade,
  question_key   text not null,
  answer         text
);
alter table public.feedback_answers enable row level security;

-- READ: members of the client (or super admin) can read that client's feedback
create policy fb_sub_read on public.feedback_submissions
  for select using (public.is_member_of(workspace_id) or public.is_super_admin());
create policy fb_scores_read on public.feedback_service_scores
  for select using (exists (select 1 from public.feedback_submissions s where s.id = submission_id and (public.is_member_of(s.workspace_id) or public.is_super_admin())));
create policy fb_ans_read on public.feedback_answers
  for select using (exists (select 1 from public.feedback_submissions s where s.id = submission_id and (public.is_member_of(s.workspace_id) or public.is_super_admin())));

-- WRITE: a member of the client (the client themselves) can submit their feedback
create policy fb_sub_write on public.feedback_submissions
  for insert with check (public.is_member_of(workspace_id));
create policy fb_scores_write on public.feedback_service_scores
  for insert with check (exists (select 1 from public.feedback_submissions s where s.id = submission_id and public.is_member_of(s.workspace_id)));
create policy fb_ans_write on public.feedback_answers
  for insert with check (exists (select 1 from public.feedback_submissions s where s.id = submission_id and public.is_member_of(s.workspace_id)));
