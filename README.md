# Velvet — starter app

A real, working Next.js app wired to your Supabase. It has:
- a login / create-account screen (your branding),
- automatic side detection (Agency for @welcometomorrow.io emails, Client for everyone else),
- a branded dashboard shell that only shows clients you're allowed to see (enforced by the database).

Everything is demo-ready; no real client data yet.

---

## STEP 1 — Get these files into your GitHub repo (Projectvelvet1/velvet)

Easiest, no tools needed:
1. Go to https://github.com/Projectvelvet1/velvet
2. Click "uploading an existing file".
3. Drag in ALL the items from this folder (app, lib, public, package.json, next.config.js,
   .gitignore, .env.local.example, README.md). Do NOT include the "node_modules" or ".next"
   folders — they aren't in this zip anyway.
4. Scroll down, click "Commit changes".

## STEP 2 — Turn OFF email confirmation (so your first login works right away)

In Supabase: Authentication → Sign In / Providers → Email → turn OFF "Confirm email" → Save.
(You can turn it back on later. Without this, sign-up makes you wait for a confirmation email.)

## STEP 3 — Deploy (Vercel with a working account, or Netlify)

When importing the repo, set these two Environment Variables BEFORE deploying:

  NEXT_PUBLIC_SUPABASE_URL       = https://lmnrdieipbxmnrsjaaim.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY  = sb_publishable_VeAx1mpVNR7ANbquJe6jpA_TjJNX0SW

Framework preset: Next.js. Build command: next build (default). Then Deploy.

## STEP 4 — Make yourself the super admin

Sign up once in the app with your @welcometomorrow.io email. Then in Supabase → SQL Editor, run:

  update public.profiles set is_super_admin = true
  where email = 'YOUR-EMAIL@welcometomorrow.io';

## STEP 5 — See the security working (optional)

In Supabase → Table Editor → workspaces, add a row (e.g. name = "Betika (demo)").
Then in "memberships", add a row linking your profile id to that workspace id.
Refresh the app — that client now appears. Without the membership row, it stays hidden.
That's the client-separation working.

---

Local dev (only if you want it): copy .env.local.example to .env.local, run `npm install`
then `npm run dev`, open http://localhost:3000.
