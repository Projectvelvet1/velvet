import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return Response.json({ error: "Not allowed" }, { status: 403 });
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const id = body?.workspaceId;
  if (!id) return Response.json({ error: "Missing client" }, { status: 400 });

  const { data: prof } = await asUser.from("profiles").select("side,is_super_admin").eq("id", user.id).single();
  if (prof?.side !== "agency") return Response.json({ error: "Not allowed" }, { status: 403 });
  const db = admin();
  const { data: ws } = await db.from("workspaces").select("id,project_lead_id").eq("id", id).single();
  if (!ws) return Response.json({ error: "Client not found" }, { status: 404 });
  const allowed = prof.is_super_admin || ws.project_lead_id === user.id;
  if (!allowed) return Response.json({ error: "Not allowed" }, { status: 403 });

  const patch = {};
  if (body.website !== undefined) patch.website = (body.website || "").trim() || null;
  if (body.industry !== undefined) patch.industry = (body.industry || "").trim() || null;
  if (body.startDate !== undefined) patch.start_date = (body.startDate || "").trim() || null;
  if (body.leadName !== undefined) patch.lead_name = (body.leadName || "").trim() || null;
  if (body.health !== undefined) patch.health = ["healthy","watch","risk"].includes(body.health) ? body.health : "healthy";
  if (body.upsell !== undefined) patch.upsell = (body.upsell || "").trim() || null;
  if (body.notes !== undefined) patch.notes = (body.notes || "").trim() || null;
  if (Object.keys(patch).length) {
    const { error } = await db.from("workspaces").update(patch).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // optional lead email change
  const leadEmail = (body?.leadEmail || "").trim().toLowerCase();
  if (leadEmail && leadEmail.includes("@")) {
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    let lid = null;
    const { data: inv } = await db.auth.admin.inviteUserByEmail(leadEmail, { data: { full_name: (body?.leadName || "").trim() }, redirectTo: `${origin}/set-password` });
    lid = inv?.user?.id || null;
    if (!lid) { const { data: ex } = await db.from("profiles").select("id").eq("email", leadEmail).single(); lid = ex?.id || null; }
    if (lid) {
      await db.from("profiles").upsert({ id: lid, email: leadEmail, side: leadEmail.endsWith("@welcometomorrow.io") ? "agency" : "client" }, { onConflict: "id", ignoreDuplicates: true });
      await db.from("memberships").upsert({ profile_id: lid, workspace_id: id, is_client_lead: true }, { onConflict: "profile_id,workspace_id", ignoreDuplicates: true });
    }
  }
  return Response.json({ ok: true });
}
