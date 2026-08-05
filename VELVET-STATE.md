# PROJECT VELVET — build state (read this FIRST every session)

This file is the durable memory. The **newest zip in /mnt/user-data/outputs is the source of truth** for code.
Always: restore from newest zip → npm install → placeholder .env.local → read the real file before editing → build + test → ship the WHOLE project.

## LIVE INFRASTRUCTURE
- GitHub: github.com/Projectvelvet1/velvet (branch main)
- Supabase project: lmnrdieipbxmnrsjaaim  (West EU / Paris)
- Vercel project: velvet1 → https://velvet1-eta.vercel.app
- Deploy today = hand-upload the whole unzipped project to GitHub → Vercel auto-builds.
  KNOWN RISK: partial uploads leave nested API route files (app/api/**) stale. Always upload EVERYTHING.

## ENV VARS (Vercel, all set & working)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (legacy service_role, required),
SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY, AHREFS_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.

## CONNECTED DATA SOURCES (real, no demo where connected)
- Ahrefs: LIVE. Traffic overview (org traffic/keywords/DR/backlinks), top queries, top pages, compare, and the Traffic trend.
- Google Search Console: LIVE (OAuth, one agency Google account). Search Console API enabled on Google Cloud.
  Per-client property match required once per client on their SEO page. Powers Search performance + Clicks trend.
- NOT connected yet: Google Ads, Meta, TikTok, LinkedIn, GA4, Looker, app stores, Slack, email, notetaker.

## HARD RULES (do not break)
- No em-dashes in product copy.
- Demo data is removed the moment a source is connected; where a source is NOT connected, show an honest "connect" state, NEVER fake numbers.
- The "my work" DASHBOARD is identical for every agency member (all departments/services). Only the person's own name/tasks/clients differ.
- The per-client SERVICE REPORT differs BY SERVICE. Only SEO's real layout is built. Others still reuse SEO's layout (placeholder) until built.
- TASK PRIVACY (velvet-26): a client sees only tasks assigned to them (or created by them). Client LEAD also sees tasks assigned to their client teammates (+ who). Agency members see all of a client's tasks among themselves. Clients NEVER see agency tasks.
- Team member nav: Dashboard, Clients, their OWN department only, Replays, Settings. No Future Clients, no Clients feedback, no Resources.
- Client portal: Home / Tasks / Settings tabs. Team + Documents live under client Settings. Clients never share the agency dashboard.
- A team member sees a client only if THAT MEMBER is assigned to it (not the client user).
- Service accounts must NOT be project leads (project lead => all-departments + admin dashboard).

## DATABASE MIGRATIONS RUN (in order; all idempotent; files in outputs)
velvet-13/14/15 task fields + any-side task RLS; 16 client_service; 17 service_guidance; 18 profiles.home_service;
19 accounts wiring; 20 delete Acme + permanent onboarding-complete trigger; 21 test wiring (leads→cosmas, assign service accts to Client Test);
22 clientmember (client-side SEO teammate); 23 service_documents (per-service per-client docs); 24 GSC tables (gsc_connection, gsc_oauth_state, client_gsc_property);
25 assign service accounts to Client Test; 26 TASK PRIVACY (is_client_lead_of + rewritten tasks_read policy).

## ACCOUNTS
Super admins: cosmas@, maxime@, brian@ (welcometomorrow.io).
Service members (home_service): seo@→seo, paid@→paid_media, aso@→aso, creative@→creative_strategy, asset@→asset_production, ugc@→ugc, dashboarding@→dashboarding, analytics@→tracking.
Test client: "Client Test" (signed, onboarding complete, all services). client@gmail.com = client lead. clientmember@gmail.com = client-side SEO teammate.

## BUILT FEATURES
- Auth/invite (super-admin only), Team (view all; edit super-admin only), Settings hub (Invite, Team, Ask Velvet training, Onboarding questions [both discovery+full], Data connections; Appearance = coming soon).
- Clients: super admin add/delete/open-view-as; team member sees only their clients, Open → their service dashboard.
- Service dashboard (SEO real): Traffic overview (Ahrefs), Trends (Traffic=Ahrefs, Clicks=GSC; Monthly/Quarterly/6m/1y; hover any bar; 1y=year-over-year, 6m=block-vs-block), Search performance (GSC totals) + per-client property picker, top queries/pages, competitors + compare, Documents (per service), tasks (agency only; member filter; Open→detail modal). Ask Velvet on page (agency only, locked to that client+service).
- Dashboard "my work": Ask Velvet (roaming over own clients), status/due cards, "Tasks Assigned" card (only tasks someone ELSE assigned to me) → list → Open → detail modal, priority queue, my clients.
- Client portal: Home (services→reports, assign a task, feedback sliders 1-10, onboarding answers), Tasks (assigned to them; lead sees team + "To: name"), Settings (their team, Documents).
- Feedback: client submits (1-10 sliders); agency Clients-feedback page (super-admin only) history + dashboard latest score.
- Ask Velvet: live (Ahrefs+GSC+tasks context), conversational, per-service trained (service_guidance), agency-only.

## OPEN / NOT BUILT (roadmap)
Feedback finishing: questions editor in Settings, trends/averages, agency response loop, low-score alert → "What needs attention".
Action Plan client-response loop (client marks Reviewed / Needs another look → feeds Back-to-me / Done-this-quarter). [flagged highest-value common feature]
Per-service client dashboards: Paid Media (AdSynth-style), ASO, Content, Analytics — each needs its data source connected; can build layout on demo first.
Integrations: Google Ads/Meta/TikTok/LinkedIn (Paid), GA4/Looker (Analytics), app stores (ASO).
Cross-cutting: Slack/email notifications, Replays, signals feed ("What needs attention"), Brand/Knowledge hub, client-lead cross-service report, pre-populated onboarding, PDF/image upload for Ask Velvet training, light mode (Appearance), OTP login, Ahrefs caching.
Housekeeping: GitHub↔Vercel reliable auto-deploy, clean up test data, rotate keys.

## LATEST SHIPPED (newest last)
...velvet-documents, velvet-24-gsc + GSC-setup-guide, velvet-gsc-connect, velvet-gsc-data, velvet-gsc-properties-fix,
velvet-trends-hover, velvet-trends-yoy, velvet-tasks-assigned, velvet-task-privacy (+velvet-26 SQL), velvet-assign-people-fix.
