import { admin } from "../../../../lib/supabaseAdmin";
import { callerFromReq } from "../../../../lib/gsc";

export async function GET(req) {
  const { prof } = await callerFromReq(req);
  if (prof?.side !== "agency") return Response.json({ error: "not allowed" }, { status: 403 });
  const { data: c } = await admin().from("gsc_connection").select("google_email,refresh_token,updated_at").eq("id", 1).maybeSingle();
  return Response.json({ connected: !!(c && c.refresh_token), email: c?.google_email || null, updated_at: c?.updated_at || null });
}
