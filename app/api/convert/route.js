import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

async function requireSuperAdmin(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("is_super_admin").eq("id", user.id).single();
  return prof?.is_super_admin ? user.id : null;
}

// Convert a prospect into a signed client: add services, project lead, team.
// Discovery answers stay attached (same workspace), nothing to migrate.
export async function POST(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const workspaceId = body?.workspaceId;
  const projectLeadId = body?.projectLeadId || null;
  const services = Array.isArray(body?.services) ? body.services : [];
  const teamAssignments = Array.isArray(body?.teamAssignments) ? body.teamAssignments : [];
  const startDate = (body?.startDate || "").trim() || null;
  const leadEmail = (body?.leadEmail || "").trim().toLowerCase();
  const leadName = (body?.leadName || "").trim();
  if (!workspaceId) return Response.json({ error: "Missing prospect" }, { status: 400 });
  if (!projectLeadId) return Response.json({ error: "A project lead is required" }, { status: 400 });

  const db = admin();
  const { data: ws } = await db.from("workspaces").select("id,name,phase").eq("id", workspaceId).single();
  if (!ws) return Response.json({ error: "Prospect not found" }, { status: 404 });
  if (ws.phase !== "prospect") return Response.json({ error: "This client is not a prospect" }, { status: 400 });

  // flip to signed + set project lead
  const wsPatch = { phase: "signed", project_lead_id: projectLeadId };
  if (startDate) wsPatch.start_date = startDate;
  if (leadName) wsPatch.lead_name = leadName;
  const { error: e1 } = await db.from("workspaces").update(wsPatch).eq("id", workspaceId);
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  if (services.length) {
    await db.from("client_services").upsert(
      services.map((s) => ({ workspace_id: workspaceId, department: s.department, service_key: s.service_key, service_label: s.service_label })),
      { onConflict: "workspace_id,service_key", ignoreDuplicates: true }
    );
  }
  if (teamAssignments.length) {
    await db.from("service_assignments").upsert(
      teamAssignments.map((a) => ({ workspace_id: workspaceId, profile_id: a.profile_id, service_key: a.service_key })),
      { onConflict: "workspace_id,profile_id,service_key", ignoreDuplicates: true }
    );
  }
  const agencyIds = new Set([projectLeadId, ...teamAssignments.map((a) => a.profile_id)]);
  await db.from("memberships").upsert(
    [...agencyIds].map((pid) => ({ profile_id: pid, workspace_id: workspaceId, is_client_lead: false })),
    { onConflict: "profile_id,workspace_id", ignoreDuplicates: true }
  );

  // optional: change/confirm the client lead
  if (leadEmail && leadEmail.includes("@")) {
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    let lid = null;
    const { data: inv } = await db.auth.admin.inviteUserByEmail(leadEmail, { data: { full_name: leadName }, redirectTo: `${origin}/set-password` });
    lid = inv?.user?.id || null;
    if (!lid) { const { data: ex } = await db.from("profiles").select("id").eq("email", leadEmail).single(); lid = ex?.id || null; }
    if (lid) {
      await db.from("profiles").upsert({ id: lid, email: leadEmail, side: leadEmail.endsWith("@welcometomorrow.io") ? "agency" : "client" }, { onConflict: "id", ignoreDuplicates: true });
      await db.from("memberships").upsert({ profile_id: lid, workspace_id: workspaceId, is_client_lead: true }, { onConflict: "profile_id,workspace_id", ignoreDuplicates: true });
    }
  }
  return Response.json({ ok: true, client: { id: ws.id, name: ws.name } });
}
