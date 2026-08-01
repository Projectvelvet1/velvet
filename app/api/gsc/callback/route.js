import { admin } from "../../../../lib/supabaseAdmin";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const back = `${url.origin}/settings/connections`;
  if (!code || !state) return Response.redirect(`${back}?error=missing_code`, 302);

  const db = admin();
  const { data: st } = await db.from("gsc_oauth_state").select("*").eq("state", state).maybeSingle();
  if (!st) return Response.redirect(`${back}?error=bad_state`, 302);

  const redirectUri = `${url.origin}/api/gsc/callback`;
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) return Response.redirect(`${back}?error=token_exchange`, 302);
  const j = await r.json();

  let email = null;
  try {
    const idp = (j.id_token || "").split(".")[1];
    if (idp) email = JSON.parse(Buffer.from(idp, "base64").toString()).email || null;
  } catch {}

  const expiry = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
  await db.from("gsc_connection").upsert({
    id: 1,
    access_token: j.access_token,
    refresh_token: j.refresh_token || undefined,
    token_expiry: expiry,
    google_email: email,
    connected_by: st.profile_id,
    updated_at: new Date().toISOString(),
  });
  await db.from("gsc_oauth_state").delete().eq("state", state);
  return Response.redirect(`${back}?connected=1`, 302);
}
