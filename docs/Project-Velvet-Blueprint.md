# Project Velvet — Build Blueprint (v4)

**A two-sided agency operating system.** A complete description of what Velvet is and how every part behaves, to be built one piece at a time. No timelines.

---

## What changed in v4 (from v3)

- **All six departments are now specified** — SEO, Paid Media, ASO, Creative, UGC & Content, Measurement.
- **Brief flow** added for Creative and UGC & Content (client ↔ agency, with approve / not-approved + notes).
- **Creators module** added under UGC & Content (creator profiles + client-visible pricing).
- **Creative performance tracking** named: Motion, plus an MMP for installs-per-creative.
- **Task assignment is open to everyone** — any user can assign a task to any other user (user *management* stays Super Admin / PM only).

Everything from v2 still stands: 7 departments (including ASO), automatic side detection, database-level isolation, the document library, two-way health scoring, the onboarding gate, and purchased-services-only Piloting.

---

## 1. What Velvet is

Velvet runs the whole agency — all clients (old and new), all departments — in one place, and gives each client an isolated portal showing only their own work and only the departments they bought. SEODesk was the single-department, agency-only ancestor; Velvet is the all-department, two-sided version. The proven SEODesk task engine is reused as the reference design.

"WT" means the agency (you); "client" means the customer org.

---

## 2. Roles, sides, and permissions

**Side is decided by the account, not chosen.** There is no side-selector. A Project Manager logging in lands on the agency side automatically; a client logging in lands on their own side automatically.

| Role | Side (auto) | Sees | Can do |
|---|---|---|---|
| **Super Admin** | Agency | Everything, every client, every department | Full control; add/assign users; billing; all reports |
| **Project Manager** | Agency | Everything for the clients assigned to them — all departments | Add/assign users; assign tasks to any task manager; set client health status; build reports; see that client's full document library |
| **Task Manager** | Agency | Only their own department, only for their assigned clients | Self-assign & complete tasks; use their department tooling; send work to client; action bounced-back work; see only their department's reports |
| **Client Admin / Project Lead** | Client | Only their own org, only departments purchased | Add team members (up to billing tier); assign tasks to agency; approve/reject deliverables; submit biweekly feedback |
| **Client Team Member** | Client | Their org, scoped to their function | Act on tasks sent to them; assign tasks to agency; view their hubs |

**User management vs task assignment — two different things:**
- **Managing users** (creating accounts, assigning people to clients or departments) is restricted to **Super Admin and Project Manager**.
- **Assigning a task**, however, is open to everyone — **any user can assign a task to any other user** (agency to agency, agency to client, client to agency). The task simply appears in that person's My Tasks. Department scoping still governs what each person sees in the *department dashboards and tooling*, but a directly assigned task always reaches its assignee.

Task managers are onboarded by department, name, and role, so anyone can address a task to the right person.

**Two isolation rules, enforced in the database (not just the screen):**
1. **Tenant isolation** — a client can only ever read/write its own rows.
2. **Department scoping** — a task manager only sees rows tagged with their department. Only the PM (for their clients) and Super Admin see across departments.

---

## 3. The 7 departments

Paid Media, **SEO**, **ASO** (App Store Optimization), Creative, Measurement, UGC, Content. Each has its own tooling. A client sees a department in their portal only if they purchased it.

---

## 4. Multi-tenant security (the backbone)

Because clients live in the same system, one client seeing another's data — or a task manager seeing another department's work — is a business-ending failure. Isolation is enforced in the database itself (row-level security), so it holds even if app code has a bug. Every record (except agency-global users) carries a `client_id` and, where relevant, a `department`. Built and verified before anything else.

---

## 5. Data model (plain English)

- **Client** (tenant) — name, website, logo, main contact, IT/dev contact, notes, billing tier, purchased departments, assigned Project Manager, onboarding status, health status.
- **User** — name, email, role, side, department, client(s) they belong to or are assigned to, Slack handle (matched to email), `reports_to` (for the team org view).
- **Task** — title, detailed brief, examples, priority, department, frequency, due date, status, assignees (many), "share result with", deliverable links/attachments, client, created-by, source→target, is-client-actionable flag, current owner.
- **Task Event** — every status change (audit trail; powers progress charts).
- **Attachment** — files/screenshots/links on a task or correction.
- **Correction** — new info + files attached to a rejected task; lands in the Needs Correction pool.
- **Brief** — a structured request that flows either way (client → agency, or agency → client for sign-off), with its own approve / not-approved + notes cycle. Used mainly by Creative and UGC & Content.
- **Creator** — a UGC creator profile: niche, what they do, contact method, payment method & pricing, how to brief them, social accounts + followers per account, links to socials, and off-social sample videos.
- **Onboarding Response** — the client's answers to the mapped onboarding steps.
- **Roadmap Item**, **Replay**, **Document**, **Creative Asset**, **Connection**, **Maturity Score**, **Health Status**, **Feedback Rating**, **Notification** — as described in their sections below.

---

## 6. The task lifecycle (the heart of the system)

This reuses SEODesk's engine and adds the full client-approval and agency-actioning flow. Read it as a single pipeline.

### Step 1 — Agency creates and delivers
The task manager works a task through: **Not started → Start → In progress → Mark done** (prompted to attach the deliverable: doc, sheet, Figma, file, link) **→ Send to client**.

On "Send to client," the task:
- lands in the client's **department section** (e.g. a Creative deliverable appears in the client's Creative area), and
- fires a **Slack notification**: *"New task from Creative sent to you by @[name]"* (plus email).

Tasks can also be created by clients and assigned back to agency task managers (bi-directional), and by the rich modal: title, AI bulk-import from a worklist doc, client, department, priority, frequency, due date, deliverable link, detailed brief, examples, multiple assignees, "share result with."

### Step 2 — Client reviews (two buttons)
The client opens the deliverable and sees the links plus **two buttons: Approve / Not approved.**

**If Not approved** → the task **bounces straight back to the original task manager who did the work** (with the client's notes/screenshots/files attached), landing in that task manager's **Needs Correction** queue — not in new tasks, and not to anyone else. They fix it and re-send, returning to Step 2.

**If Approve** → the client is given **two CTAs: Action on it / Send back to be actioned.**

### Step 3a — Client actions it themselves ("Action on it")
The client clicks **Action on it** → a **Done** button appears → the client clicks **Done** once finished → on the agency side the task shows **Done by client**.

### Step 3b — Client bounces it back to the agency ("Send back to be actioned")
The client clicks **Send back to be actioned** → the task goes to the task manager's **Tasks to Action** dashboard. Now the task manager chooses one of two:

- **Handle it themselves** → they action it and click **Done**.
- **Assign to another department** → they pick a task manager (from the task managers under that client) → the selected task manager sees it in *their* **Tasks to Action** dashboard, clicks **Received** to acknowledge, and clicks **Done** when finished.

### Per-task-manager tracking (why the statuses are granular)
The whole point of the fine-grained statuses is that **every task manager can track their own throughput** on their My Tasks dashboard: how many tasks they did, how many are **marked done**, how many are **pending**, and how many they **haven't done**. The same counts roll up so a Project Manager can see each person's load and completion across their clients.

### Progress reporting
A per-client chart shows what was sent to client versus what actually happened (approved, done by client, actioned, or not approved) — the "% of delivered work the client implemented" view from SEODesk. This is what exposes the gap when the agency delivers but the client doesn't action.

### Visibility
Task managers see only their own department's tasks. Project Managers see everything for their assigned clients. Super Admin sees all.

---

## 7. Client side

### Onboarding gate (from the Scalezia screenshot)
A newly invited client's homepage is the **Onboarding** flow — a stepped checklist (Company presentation → Business map → Offer → …, each with duration, a "Mandatory" tag, and "Start the step"). **The rest of the portal is locked until onboarding is complete.** Clicking Dashboard before completion redirects to Onboarding; only when onboarding is marked complete does the Dashboard and the purchased hubs unlock. Onboarding questions come from the COO.

### Piloting hubs (purchased only)
The Piloting menu shows only the services the client bought. Possible hubs: **Roadmap** (shared client/WT projects, todos, owners, timelines), **Replays** (calls from your notetaker: recording + recap + action items, theme-mapped and searchable), **Documentation** (organised docs/decks/trackers), **Creative Hub** (validate concepts/ads, approve creators, past performance + creative maturity), **Performance Hub** (paid + organic over time + performance maturity), **Analytics Hub** (competitive insights, tracking anomalies, data health score, audience/funnel).

### Account
- **Team** — the client sees only the WT people assigned to them and their own team.
- **Onboarding** — the flow above.
- **Biweekly feedback** — the project lead's rating dashboard (see Health & maturity).

---

## 8. Agency side — workspaces

Beyond the task views:

### Needs Correction dashboard
Tasks the client marked **Not approved → Send back for correction** land here (not in new tasks), carrying the client's new info/screenshots/files, scoped to the responsible department.

### Tasks to Action dashboard
Approved tasks the client **sent back to be actioned** land here. The task manager handles them or reassigns to another department's task manager under that client (who acknowledges with Received, then Done).

### Clients Reports & Documents library
A dedicated agency menu holding every client's reports and shipped documents.
- **Auto-created per client** on onboarding.
- **Auto-filed:** whenever a task manager sends a deliverable to a client, that file/link is both shown to the client and automatically saved here under that client → that department. Example: SEO sends an audit → the client sees it on their hub and it's stored under the client's SEO documents.
- **Access (agency only):**

| Role | Sees in the library |
|---|---|
| **Task Manager** | Only their own department's reports (across their assigned clients) |
| **Project Manager** | All departments, but only for clients assigned to them |
| **Super Admin** | Everything |

### Client Health Score dashboard (PM)
The Project Manager sets and monitors each client's health here (see Health & maturity).

---

## 9. Department tooling & the Team view

**SEO** — already built in SEODesk: embedded GSC view (behaves like GSC), Ahrefs data, AI analyzer producing short bullet reports, SEO Audit, per client. Port as-is.

**Paid Media** — connects Google, Meta, TikTok, LinkedIn, Reddit, Bing, GA4, Search Console into one workspace. Scheduled monitoring that catches spend spikes / conversion drops / off-pace budgets and surfaces the next best action; a living brand profile built from uploaded briefs/SOPs; forecasts, anomaly detection and budget allocation from a real ML engine that the AI explains in plain English. **Nothing goes live automatically — every change waits for human approval.**

**ASO** — mirrors Paid Media, applied to the app stores. Connects App Store Connect and Google Play Console plus an ASO tool (e.g. AppTweak, Sensor Tower, App Radar) for keyword rankings, store conversion rates, and category positions. Scheduled monitoring flags ranking or conversion drops and surfaces the next best action; AI analysis produces bullet learnings; every store change waits for human approval.

**Creative** — has a two-way **brief** flow on top of normal tasks:
- *Client → agency:* on the client side, the Creative area has a **Send brief** option (separate from normal tasks). A sent brief lands on the Creative task manager assigned to that client, under "creative briefs."
- *Agency → client:* a task manager can **share a creative brief with the client**, who can **approve** or **not approve with notes** on what to correct.
- Plus normal **Add task** like every department.
- **Creative performance tracking:** the tool you described is **Motion** (motionapp.com) — it connects Meta / TikTok / YouTube / Google ad accounts and organises performance *by creative*, so the team can compare, say, three creatives side by side (spend per creative, engagement, results) and spot the winner. Because your clients are apps and you care about *installs per creative*, install attribution is pulled from a mobile measurement partner (AppsFlyer, Adjust, or Singular) alongside Motion's spend data. AI analysis turns the comparison into bullet learnings.

**UGC & Content** — same two-way brief flow as Creative, plus a **Creators** module:
- A **Creators** menu with a table of added creators and an **Add a creator** button.
- Each creator profile holds: niche / what they do, how they're contacted, how they're paid and their pricing, how to brief them, number of social accounts and followers per account, links to their socials, and off-social sample videos.
- **Client side:** the client sees the creators shared with them, with the full profile *including pricing and payment methods* — because the client pays the creators directly.

**Measurement** — the analytics and tracking backbone. Builds and connects the reporting layer across web (GA4, GTM/server-side tracking), app (an MMP — AppsFlyer / Adjust / Singular), and each ad platform the client runs on (Meta, Google, TikTok, Reddit, etc.), surfaced through Looker Studio dashboards. It owns tracking health/QA and produces the audience segments, events, and reports that the **Paid Media** team reuses for retargeting. This is also the data spine behind the client's Analytics Hub and the data-health/maturity score.

**Team view** (both sides, same component, filtered by tenant): an org/hierarchy view. Agency-side it's the internal team; client-side it shows only the WT people assigned to that client plus the client's own team and their approvers per stream. Powered by `reports_to`.

---

## 10. Health & maturity

- **PM health status** — the Project Manager marks each client **Healthy / To Watch / At Risk** (based on performance trends or loss of confidence) with a reason.
- **Client biweekly feedback** — every two weeks the client project lead rates, per purchased department, the agency out of 10 and rates themselves against it. This exposes mismatches (agency scoring 9 on delivery while the client self-scores 3 on actioning explains stalled results).
- **One dashboard** — both feed the PM's Client Health Score dashboard: a single honest view of each account's health and why.
- **Maturity dimensions** (separate from health), each Low → Developing → High:
  - **Creative** — Low: order-taker executing briefs. High: shapes messaging, UX and direction as a strategic partner.
  - **Performance** — Low: reactive, intuition-driven. High: standardised systems, clear KPIs, predictive optimisation.
  - **Data / health** — Low: broken tracking, no single source of truth. High: clean tracking, unified warehouse, trustworthy metrics (a data health score can be computed automatically from tracking completeness).
  - Shown as a level plus 2–3 bullets. The CEO should own these definitions.

---

## 11. Integrations

**Already connected (use first):** Ahrefs, BigQuery (your warehouse — powers Performance & Analytics), your slides/deck renderer (WT Ads Intelligence), Slack, Gmail, Google Calendar, Google Drive, Notion, Canva. Plus GSC (in SEODesk).

**Needs OAuth app review before going live (a dependency, not a deadline):** Meta, Google Ads, TikTok, LinkedIn, Reddit, Bing. Reviews take weeks and are outside your control, so submit early in parallel.

---

## 12. AI layer

- **AI reporting** from connected data, narrated on your deck renderer.
- **AI analysis** ("Analyze with AI") → short bullet insights per hub.
- **Brand profile** — briefs/SOPs uploaded once, used as context.
- **Scheduled monitoring** — recurring scan for spikes/drops → next-best-action cards.
- **Human-in-the-loop** — every AI-recommended change to a live ad account needs explicit approval.

---

## 13. Notifications

Fire on **email** (the recipient's shared email) **and Slack** — either a direct message to the Slack user matched to that email, or a **client-specific shared channel**. Triggers: task assigned, sent to client, approve/not-approved, action-on-it/send-back, correction requested, reassignment, done, biweekly-feedback due. Example wording: *"New task from Creative sent to you by @name."*

---

## 14. Recommended stack (solo, non-technical, vibe-coding)

- **Framework:** Next.js (React) — best handled by AI coding tools, Vercel-native.
- **Database + Auth + File storage:** **Supabase** (hosted Postgres). Its row-level security enforces tenant + department isolation at the database level — the single most important safety choice — plus login/roles and file storage for attachments and the document library.
- **Hosting:** GitHub + Vercel for the prototype; migrate to the agency's AWS later.
- **AI:** Anthropic Claude API.
- **Dashboards:** embed Looker Studio first; native charts off BigQuery later.
- **Data warehouse:** BigQuery.
- **Notifications:** Slack + email.

---

## 15. Build order (by dependency, not date)

1. **Foundation** — Supabase auth + row-level security, the 5 roles, auto-side detection, Client & User entities, isolation. Built and tested first.
2. **Task engine** — the modal, statuses, assignment (incl. bi-directional), My Tasks, notifications.
3. **Full approval + actioning flow** — the two client buttons, Action-on-it vs Send-back-to-be-actioned, Done by client, Tasks to Action and Needs Correction dashboards, reassignment, the progress chart.
4. **Onboarding gate** — the stepped flow that unlocks the portal; purchased-services gating on Piloting.
5. **Two sides live** — agency workspaces + isolated client portal with auto-routing.
6. **Document library** — auto-filing on send-to-client, department-scoped access.
7. **Department tooling** — SEO (port), Paid Media, then the others as specs arrive.
8. **Hubs** — Roadmap, Replays, Documentation, Performance/Analytics (Looker embed), Creative, Team.
9. **AI & reporting** — reports, analysis, brand profile, scheduled monitoring.
10. **Health & maturity** — PM health status, client biweekly feedback, maturity levels, the combined dashboard.

---

## 16. Open questions (for COO / CEO)

1. Onboarding — the exact mapped questions/steps, and what triggers onboarding.
2. Department specs — the six questions answered for ASO, Creative, Measurement, UGC, Content.
3. Maturity definitions — CEO to confirm/own.
4. Billing tiers — team-member counts and department access per tier.
5. Notetaker — which product, and does it expose recordings/transcripts by link or API?
6. Notifications — personal Slack DM and/or a client-specific shared channel?
7. Green light to submit Meta/Google/TikTok/LinkedIn OAuth applications early.
8. Corrections & reassignments — is there a limit on correction loops, and can a bounced-back task be reassigned more than once?

---

*Next: pick one item from the build order and we build it — one step at a time.*
