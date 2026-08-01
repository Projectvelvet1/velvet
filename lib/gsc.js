import { admin } from "./supabaseAdmin";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Returns a valid access token for the agency Google connection, refreshing if
// needed. Returns null if not connected.
export async function gscAccessToken() {
  const db = admin();
  const { data: c } = await db.from("gsc_connection").select("*").eq("id", 1).maybeSingle();
  if (!c || !c.refresh_token) return null;
  const notExpired = c.token_expiry && new Date(c.token_expiry).getTime() > Date.now() + 60000;
  if (c.access_token && notExpired) return c.access_token;

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    refresh_token: c.refresh_token,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) return null;
  const j = await r.json();
  const expiry = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
  await db.from("gsc_connection").update({ access_token: j.access_token, token_expiry: expiry, updated_at: new Date().toISOString() }).eq("id", 1);
  return j.access_token;
}

// Verify the caller from an Authorization: Bearer <supabase access token> header.
export async function callerFromReq(req) {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return { user: null, prof: null };
  const db = admin();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return { user: null, prof: null };
  const { data: prof } = await db.from("profiles").select("id,side,is_super_admin").eq("id", user.id).maybeSingle();
  return { user, prof };
}
