# PROJECT VELVET — Full Handoff & Reference

This single document is the project memory: what Velvet is, the hard rules, the live
infrastructure, every connection made and still to make, the database, the accounts,
and the current state of every service. It is written so another builder (human or an
AI tool such as Lovable) can pick the project up without re-reading the whole history.

Companion files in this package:
- The **entire codebase** (this folder).
- `sql/` — every database migration, in order.
- `docs/` — the blueprint (original + the version with figures), the GSC setup guide,
  and the durable state file.

---

## 1. WHAT VELVET IS

Velvet is a two-sided operating system for the agency **Welcome Tomorrow (WT)**.
- **Agency side:** runs every client and department in one place.
- **Client side:** a private portal where each client sees only their own work.

Work is grouped into **three departments** and **eight services**:
- **Performance:** Paid Media, SEO, ASO
- **Content:** Creative Strategy, Asset Production, UGC
- **Analytics:** Tracking, Dashboarding

Running across all services: **Ask Velvet** (an assistant that answers/summarises,
agency only), a per-client **task action plan**, a **documents library**, and a
**branded onboarding intake**.

**Tech stack:** Next.js 14 (App Router), React 18, Supabase (Postgres + Auth + RLS),
deployed on Vercel. Third-party APIs: Ahrefs, Anthropic (Claude), Google (Search Console OAuth).

---

## 2. HARD RULES (do not break)

1. **No em-dashes in product copy.**
2. **Never fake data.** Demo data is removed the moment a source is connected. Where a
   source is NOT connected, show an honest "demo / connect X" state. Never present demo
   numbers as real.
3. **Deploy the WHOLE project.** Partial uploads leave nested API route files
   (`app/api/**`) stale, which has caused real bugs. Always upload everything.
4. **Supabase auth in API routes must use `getUser(token)`** with the bearer token,
   never bare `getUser()`. Bare getUser is unreliable and caused "privileges revoked"
   symptoms for the super admin. All routes now pass the token.
5. **The "my work" dashboard is identical for every agency member** (all departments).
   Only the person's own name/tasks/clients differ.
6. **The per-client service report differs BY SERVICE** (each service has its own layout).
7. **Task privacy:** a client sees only tasks assigned to or created by them. A client
   *lead* also sees tasks assigned to their client-side teammates (with "To: name").
   Agency members see all of a client's tasks among themselves. Clients NEVER see agency tasks.
8. **A team member sees a client only if that member is assigned to it.**
9. **Service accounts must not be project leads** (project lead => all-departments + admin view).
10. **Child-safety / honesty:** never oversell demo as live; be explicit in captions and tags.

---

## 3. LIVE INFRASTRUCTURE

- **GitHub:** github.com/Projectvelvet1/velvet (branch `main`)
- **Supabase project:** `lmnrdieipbxmnrsjaaim` — URL `https://lmnrdieipbxmnrsjaaim.supabase.co` (West EU / Paris)
  - Auth: signups OFF (invite-only). Add users in Dashboard → Auth → Users → Add user (+ Auto Confirm).
    SQL wires access rows but NOT passwords.
- **Vercel project:** `velvet1` — live at `https://velvet1-eta.vercel.app`
- **Deploy today** = hand-upload the whole unzipped project to GitHub → Vercel auto-builds.
  Strongly recommend moving to reliable GitHub↔Vercel auto-deploy to eliminate stale-upload bugs.

### Environment variables (Vercel — all set & working)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      (legacy service_role key, REQUIRED — bypasses RLS in admin())
SUPABASE_SECRET_KEY
ANTHROPIC_API_KEY
AHREFS_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```
Rotate these keys before wider handoff. They are not stored in the repo (they live in Vercel env).

---

## 4. CONNECTIONS — MADE AND STILL TO MAKE

### Connected and LIVE (real data)
- **Ahrefs** — SEO. Traffic overview, top queries/pages, compare, traffic trend.
  Note: the history endpoint select must be `date,org_traffic` only (no org_keywords there).
- **Google Search Console (GSC)** — SEO. OAuth, one agency Google account holds all client
  properties. "Search Console API" must be enabled in Google Cloud (project 64154262994).
  Each client's property is matched once on their SEO page. Powers Search performance + Clicks trend.
  Data lags ~3 days; ~16-month retention limits year-over-year clicks. Full setup steps in
  `docs/GSC-setup-guide.md`.
- **Anthropic (Claude)** — powers Ask Velvet.

### NOT connected yet (each is its own OAuth/API build, like GSC was)
| Service | Sources to connect |
|---|---|
| Paid Media | Google Ads, Meta, TikTok, LinkedIn |
| ASO | App Store Connect, Google Play Console (AppTweak later) |
| Creative Strategy / Asset Production / UGC | Atria + Adshore (connected together); optionally Google & Meta; installs from the app measurement partner (MMP, e.g. AppsFlyer) |
| Dashboarding | GA4, BigQuery, the MMP; optional Looker Studio embed |
| Tracking | health checks against GA4 / GTM / pixels / MMP |
| Cross-cutting | Slack, email, meeting notetaker |

When a source connects, that service's demo is replaced by real numbers; everything else stays demo until connected.

---

## 5. DATABASE

Run migrations in numeric order (`sql/velvet-01…27`), then the GSC and forms tables.
All are idempotent (safe to re-run). Helper functions are `SECURITY DEFINER`.

### Key helper functions
`is_super_admin()`, `is_member_of(ws)`, `is_agency()`, `is_client_lead_of(ws)`.

### Enums
`dept`, `phase` ('prospect' | 'signed'), `side` ('agency' | 'client').

### Core tables (high level)
- **profiles**(id, email, side, is_super_admin, home_department[dept], home_service[text], job_title, full_name)
- **workspaces**(id, name, website, phase, is_demo, onboarding_complete, project_lead_id, health, …) — a workspace = a client
- **client_services**(workspace_id, department[dept], service_key, service_label)
- **memberships**(profile_id, workspace_id, is_client_lead, client_service; unique(profile_id, workspace_id))
- **service_assignments**(workspace_id, profile_id, service_key)
- **tasks**(…, priority, frequency, due_date, deliverable_link, description, share_with, assignee_id, created_by, client_note, status)
- **competitors**, **feedback_*  **, **service_guidance**, **service_documents**
- **onboarding_responses**(workspace_id, phase['discovery'|'full'], question_key, answer)
- **onboarding_forms**(workspace_id NULL = default/all-future, else per-client override; definition JSONB) — velvet-27
- **GSC:** gsc_connection (singleton id=1), gsc_oauth_state, client_gsc_property — velvet-24

### Notable migrations
- **20** — delete Acme + permanent onboarding-complete trigger
- **24** — GSC tables
- **26** — task privacy (`is_client_lead_of` + rewritten `tasks_read` policy)
- **27** — onboarding_forms (scoped intake: default vs per-client)

---

## 6. ACCOUNTS

- **Super admins:** cosmas@, maxime@, brian@ (welcometomorrow.io)
- **Service members** (home_service): seo@→seo, paid@→paid_media, aso@→aso,
  creative@→creative_strategy, asset@→asset_production, ugc@→ugc,
  dashboarding@→dashboarding, analytics@→tracking
- **Test client "Client Test"** (signed, onboarding complete, all 8 services, real website+data):
  - client@gmail.com = client lead
  - clientmember@gmail.com = client-side SEO teammate
- (Acme was deleted in velvet-20.)

---

## 7. STATE OF EVERY SERVICE

Each per-client service page shows: **Ask Velvet** on top (agency only), then the
service report, then the shared **task browser** (agency only) and **Documents**.
Client view removes Ask Velvet and the internal task browser.

| Service | State | What it shows |
|---|---|---|
| **SEO** | **LIVE** (Ahrefs + GSC) | Search performance, organic traffic, top queries/pages, competitors + compare, trends (traffic + clicks). |
| **Paid Media** | Demo | Google Ads metric block (spend/ROAS/CPA/conversions/installs/pacing/wasted), Current campaigns (Running/Stopped), channel breakdown, trend. |
| **ASO** | Demo | Installs, store conversion, impressions, page views, iOS/Android split, keyword rankings, competitor apps + visibility-over-time graph. |
| **Creative Strategy** | Demo | Ad-type filter, AI learnings, gallery of creative cards (hero), compact comparison table. Every creative shows a creator ("In-house" when not external). |
| **Asset Production** | Demo | Production pipeline (Requested → In production → In review → Delivered), max 2 cards/column + "View all" modal with This week/month/quarter (quarter picks year + Q1–Q4), recently delivered. |
| **UGC** | Demo | Creator roster (profiles + pricing/payment; client pays creators directly), AI learnings, per-ad performance sliced by creator. |
| **Tracking** | Demo | Health board: connections (connected/pending/broken), tracked events (firing status), setup health checklist, recent changes. NOT a performance report. |
| **Dashboarding** | Demo | Overview (KPIs, install→FTD funnel, sources, app + web events) + "Full report (Looker)" embed tab. |

Shared/built: team-member "my work" dashboard, super-admin overview, client portal,
branded step-by-step onboarding intake (all fields required), onboarding questions editor
(target all-future or one client), Settings hub (invite, team, Ask Velvet training,
data connections, onboarding answers download to Word/PDF), feedback sliders.

---

## 8. FILE MAP

Components, lib, pages and API routes present in this build:

```
COMPONENTS:
  components/AddTask.js
  components/AgencyNav.js
  components/AnalyticsReport.js
  components/AskVelvet.js
  components/AsoReport.js
  components/AssetReport.js
  components/AssignTask.js
  components/ClientView.js
  components/ConfirmDelete.js
  components/CreativeReport.js
  components/Modal.js
  components/PaidMediaReport.js
  components/Shell.js
  components/TaskDetail.js
  components/TrackingReport.js
  components/UgcReport.js
LIB:
  lib/agencyNav.js
  lib/gsc.js
  lib/onboardingQuestions.js
  lib/sources.js
  lib/supabase.js
  lib/supabaseAdmin.js
APP PAGES:
  app/client/[id]/page.js
  app/client/[id]/service/[key]/page.js
  app/clients/page.js
  app/dashboard/page.js
  app/feedback/page.js
  app/invite/page.js
  app/login/page.js
  app/onboarding/page.js
  app/page.js
  app/prospects/page.js
  app/questions/page.js
  app/service/[key]/page.js
  app/set-password/page.js
  app/settings/connections/page.js
  app/settings/onboarding-answers/page.js
  app/settings/page.js
  app/settings/velvet/page.js
  app/team/page.js
API ROUTES:
  app/api/ahrefs/route.js
  app/api/ask-velvet/route.js
  app/api/client-context/route.js
  app/api/client-details/route.js
  app/api/client-team/route.js
  app/api/clients/route.js
  app/api/convert/route.js
  app/api/dashboard-clients/route.js
  app/api/gsc/callback/route.js
  app/api/gsc/connect/route.js
  app/api/gsc/data/route.js
  app/api/gsc/properties/route.js
  app/api/gsc/property/route.js
  app/api/gsc/status/route.js
  app/api/invite/route.js
  app/api/onboarding-answers/route.js
  app/api/onboarding-complete/route.js
  app/api/onboarding-form/route.js
  app/api/onboarding-save/route.js
  app/api/prospects/route.js
  app/api/questions-ai/route.js
  app/api/questions/route.js
  app/api/tasks-import/route.js
  app/api/team/route.js
```

Key files to know:
- `lib/supabase.js`, `lib/supabaseAdmin.js` (admin() = service_role, bypasses RLS),
  `lib/gsc.js` (GSC token refresh + `callerFromReq` bearer verify), `lib/onboardingQuestions.js`
  (the INTAKE_STEPS default form), `lib/agencyNav.js`, `lib/sources.js`.
- `app/client/[id]/service/[key]/page.js` — the per-service report; branches by `key`
  (isSeo, isPaid, isAso, isCreative, isAsset, isUgc, isTracking, isDashboarding) to the right component.
- `components/*Report.js` — one component per service dashboard.

---

## 9. ROADMAP / OPEN ITEMS

- **Reviewed / Needs another look** client review loop (blueprint's key client interaction;
  Asset Production's "In review" column is set up for it). Highest-value cross-cutting feature.
- **Connect real sources** (each its own build like GSC): Google Ads/Meta/TikTok/LinkedIn (Paid),
  GA4/BigQuery + Looker persistence (Analytics/Dashboarding), App Store Connect/Google Play/AppTweak (ASO),
  Atria+Adshore + MMP (Content).
- **Persist demo-only state:** Looker embed URL per client, ASO competitor apps per client,
  UGC "Creator" entity as editable records, Asset "Deliverable/Plan Item" entities.
- Feedback finishing (questions editor, trends/averages, response loop, low-score alerts).
- Cross-cutting: Slack/email notifications, "What needs attention" signals feed, Brand/Knowledge hub,
  client-lead cross-service report, pre-populated onboarding, OTP login, Ahrefs caching, light mode.
- Housekeeping: reliable GitHub↔Vercel auto-deploy, clean up test data, rotate keys.

---

## 10. NOTES FOR LOVABLE (or any new environment)

Be aware: this is a **Next.js App Router** app with **server-side API routes**, live
**OAuth (Google Search Console)**, and third-party API calls (Ahrefs, Anthropic). Lovable
builds React/Vite frontends wired to Supabase and will not natively "continue" a Next.js
repo the way a fresh Lovable project works. Practical guidance:

- The **Supabase database, SQL migrations, RLS policies, and these rules transfer perfectly**
  as the backend/foundation. Point Lovable at the same Supabase project (or a copy) and run `sql/` in order.
- The **code here is the reference implementation.** Lovable may rebuild the frontend its own
  way; use these components as the spec for each screen (layout, palette, what each role sees).
- The **server-side pieces** (Ahrefs calls, GSC OAuth, Ask Velvet via Anthropic) must live in
  server functions / edge functions wherever you host them — do not put API keys in client code.
- **Brand:** font Outfit; palette ink #0B0D12, gold #F7C948, danger #C0392B, surface #F5F6F8,
  white cards, cloud metric cells #F5F6F8. Per-service accent colors are in the components.
- **Demo vs live:** keep the "demo / connect X" tags until each source is actually connected.

---

## 11. REFERENCE DOCS (in docs/)

- `Project-Velvet-Blueprint.md` and the original `.docx` — the CEO/COO source of truth for scope.
- `Project-Velvet-Blueprint-with-Figures.docx` — the blueprint plus a figure for every service
  (team view + client view) and the shared screens.
- `GSC-setup-guide.md` — click-by-click Google Cloud + Search Console connection.
- `VELVET-STATE.md` — the running state file kept during the build (this HANDOFF supersedes it where they differ).
