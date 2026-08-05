import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

// Saves onboarding answers via admin (service_role) so persistence never depends
// on RLS. Allowed if caller is: super admin, a member of the client, or the
// client's project lead (agency filling on behalf).
export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return Response.json({ error: "Not allowed" }, { status: 403 });
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const workspaceId = body?.workspaceId;
  const phase = body?.phase === "full" ? "full" : "discovery";
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
  if (!workspaceId) return Response.json({ error: "Missing client" }, { status: 400 });

  const db = admin();
  // authorize
  const { data: prof } = await db.from("profiles").select("is_super_admin").eq("id", user.id).single();
  let ok = !!prof?.is_super_admin;
  if (!ok) {
    const { data: mem } = await db.from("memberships").select("id").eq("profile_id", user.id).eq("workspace_id", workspaceId).maybeSingle();
    ok = !!mem;
  }
  if (!ok) {
    const { data: ws } = await db.from("workspaces").select("project_lead_id").eq("id", workspaceId).single();
    ok = ws?.project_lead_id === user.id;
  }
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 403 });

  const rows = Object.entries(answers).map(([question_key, answer]) => ({
    workspace_id: workspaceId, phase, question_key, answer: answer || "", updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await db.from("onboarding_responses").upsert(rows, { onConflict: "workspace_id,phase,question_key" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
