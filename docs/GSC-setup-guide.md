# Connecting Google Search Console to Velvet — step by step

You only do this once. It connects the one agency Google account that already has all your clients' Search Console properties. Follow it in order. Where you must copy a value, it's in `code`.

Two exact values you'll need to paste into Google:

- Authorized redirect URI: `https://velvet1-eta.vercel.app/api/gsc/callback`
- Authorized JavaScript origin / app home: `https://velvet1-eta.vercel.app`

---

## Part A — Google Cloud (about 10 minutes)

1. Go to https://console.cloud.google.com and sign in with the **agency Google account** (the one that has all the clients' Search Console properties).

2. Create a project. Top bar, click the project dropdown (left of the search bar), then "New project". Name it `Velvet`. Click "Create". Wait a few seconds, then make sure `Velvet` is the selected project in the top bar.

3. Enable the Search Console API. In the top search bar type `Search Console API`, open it, and click "Enable". (If it says "Manage", it's already enabled, that's fine.)

4. Set up the consent screen. Left menu (the ☰ hamburger) → "APIs & Services" → "OAuth consent screen".
   - User type: choose "External". Click "Create".
   - App name: `Velvet`. User support email: pick your email. Developer contact email: your email. Leave everything else blank. Click "Save and continue".
   - Scopes: just click "Save and continue" (we don't add anything here).
   - Test users: click "Add users", type the **agency Google account email** (the same one you're signed in as), add it, then "Save and continue".
   - Summary: "Back to dashboard". Leave the app in "Testing" mode, that's all we need for one agency account.

5. Create credentials. Left menu → "APIs & Services" → "Credentials" → top "Create credentials" → "OAuth client ID".
   - Application type: "Web application".
   - Name: `Velvet web`.
   - Under "Authorized JavaScript origins", click "Add URI" and paste: `https://velvet1-eta.vercel.app`
   - Under "Authorized redirect URIs", click "Add URI" and paste: `https://velvet1-eta.vercel.app/api/gsc/callback`
   - Click "Create".
   - A box pops up with **Client ID** and **Client secret**. Keep this open, or copy both somewhere safe. You'll paste them next.

---

## Part B — Put the two values into Velvet (Vercel)

Same place you added the other keys.

6. Go to https://vercel.com → your `velvet1` project → "Settings" → "Environment Variables".

7. Add two variables (name on the left, value on the right):
   - `GOOGLE_CLIENT_ID` = the Client ID from step 5
   - `GOOGLE_CLIENT_SECRET` = the Client secret from step 5
   Set them for Production (and Preview if it asks). Save.

8. Redeploy so the new keys take effect: Vercel → "Deployments" → the latest one → "…" menu → "Redeploy". (Or just push the Velvet code update I gave you; either works.)

---

## Part C — Connect inside Velvet

9. Open Velvet, sign in as a super admin, go to Settings → "Data connections".

10. Click "Connect Google Search Console". You'll be sent to Google.
    - Pick the **agency Google account**.
    - Google may show a warning that the app isn't verified (because it's in Testing mode). Click "Continue" / "Advanced → go to Velvet (unsafe)". This is expected and safe, it's your own app.
    - Approve the read-only Search Console permission.

11. You'll land back on the Data connections screen and it should say "connected as <your email>".

That's it. Next, on each client's SEO page you'll match that client to its Search Console property, and the real clicks/impressions replace the "connect GSC" placeholders. I'll build that property-matching step next.

---

### If something goes wrong
- "Connection didn't finish (bad_state)" or "(token_exchange)": usually the redirect URI in step 5 doesn't exactly match `https://velvet1-eta.vercel.app/api/gsc/callback`. Re-check it, no trailing slash, no typos.
- Still stuck: tell me the exact message shown on the Data connections screen and I'll pinpoint it.
