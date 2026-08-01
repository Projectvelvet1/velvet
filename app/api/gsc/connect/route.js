import { admin } from "../../../../lib/supabaseAdmin";
import { callerFromReq } from "../../../../lib/gsc";

export async function POST(req) {
  const { prof } = await callerFromReq(req);
  if (!prof?.is_super_admin) return Response.json({ error: "Only a super admin can connect Google." }, { status: 403 });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: "GOOGLE_CLIENT_ID is not set in the environment yet." }, { status: 400 });

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/gsc/callback`;
  const state = crypto.randomUUID();
  await admin().from("gsc_oauth_state").insert({ state, profile_id: prof.id });

  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/webmasters.readonly openid email",
    state,
  });
  return Response.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}` });
}
