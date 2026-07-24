import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Returns { uid, isSuper } for a signed-in AGENCY user, else null.
async function agencyUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("side,is_super_admin").eq("id", user.id).single();
  if (prof?.side !== "agency") return null;
  return { uid: user.id, isSuper: !!prof.is_super_admin, token };
}

export async function POST(req) {
  const me = await agencyUser(req);
  if (!me || !me.isSuper) return Response.json({ error: "Not allowed" }, { status: 403 });

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const name = (body?.name || "").trim();
  const leadEmail = (body?.leadEmail || "").trim().toLowerCase();
  const services = Array.isArray(body?.services) ? body.services : [];
  const projectLeadId = body?.projectLeadId || null;
  const teamAssignments = Array.isArray(body?.teamAssignments) ? body.teamAssignments : []; // [{profile_id, service_key}]
  if (!name) return Response.json({ error: "Client name is required" }, { status: 400 });
  if (!leadEmail || !leadEmail.includes("@")) return Response.json({ error: "The client lead's email is required" }, { status: 400 });
  if (!projectLeadId) return Response.json({ error: "A project lead is required" }, { status: 400 });

  const db = admin();

  // 1) workspace with project lead
  const { data: ws, error: e1 } = await db.from("workspaces")
    .insert({ name, is_demo: true, project_lead_id: projectLeadId }).select("id,name").single();
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  // 2) services
  if (services.length) {
    const { error: e2 } = await db.from("client_services").insert(
      services.map((s) => ({ workspace_id: ws.id, department: s.department, service_key: s.service_key, service_label: s.service_label }))
    );
    if (e2) return Response.json({ error: e2.message }, { status: 500 });
  }

  // 3) invite the client-side lead + link them
  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
  let clientLeadId = null;
  const { data: inv } = await db.auth.admin.inviteUserByEmail(leadEmail, {
    data: { full_name: (body?.leadName || "").trim() }, redirectTo: `${origin}/set-password`,
  });
  clientLeadId = inv?.user?.id || null;
  if (!clientLeadId) { const { data: ex } = await db.from("profiles").select("id").eq("email", leadEmail).single(); clientLeadId = ex?.id || null; }
  if (clientLeadId) {
    await db.from("profiles").upsert({ id: clientLeadId, email: leadEmail, side: leadEmail.endsWith("@welcometomorrow.io") ? "agency" : "client" }, { onConflict: "id", ignoreDuplicates: true });
    await db.from("memberships").upsert({ profile_id: clientLeadId, workspace_id: ws.id, is_client_lead: true }, { onConflict: "profile_id,workspace_id", ignoreDuplicates: true });
  }

  // 4) service assignments (agency teammates handling each service)
  if (teamAssignments.length) {
    await db.from("service_assignments").insert(
      teamAssignments.map((a) => ({ workspace_id: ws.id, profile_id: a.profile_id, service_key: a.service_key }))
    );
  }

  // 5) give the project lead + every assigned teammate visibility (membership)
  const agencyIds = new Set([projectLeadId, ...teamAssignments.map((a) => a.profile_id)]);
  const memberRows = [...agencyIds].map((pid) => ({ profile_id: pid, workspace_id: ws.id, is_client_lead: false }));
  if (memberRows.length) {
    await db.from("memberships").upsert(memberRows, { onConflict: "profile_id,workspace_id", ignoreDuplicates: true });
  }

  return Response.json({ ok: true, client: ws, invited: leadEmail });
}

export async function GET(req) {
  const me = await agencyUser(req);
  if (!me) return Response.json({ error: "Not allowed" }, { status: 403 });
  const db = admin();

  // super admin sees all; a regular teammate sees only clients they're a member of
  let workspaces;
  if (me.isSuper) {
    const { data } = await db.from("workspaces").select("id,name,is_demo,onboarding_complete,project_lead_id,created_at").order("created_at", { ascending: false });
    workspaces = data || [];
  } else {
    const { data: mem } = await db.from("memberships").select("workspace_id").eq("profile_id", me.uid);
    const ids = (mem || []).map((m) => m.workspace_id);
    if (!ids.length) { return Response.json({ clients: [], canAdd: false }); }
    const { data } = await db.from("workspaces").select("id,name,is_demo,onboarding_complete,project_lead_id,created_at").in("id", ids).order("created_at", { ascending: false });
    workspaces = data || [];
  }

  const { data: svc } = await db.from("client_services").select("workspace_id,service_label");
  const svcBy = {}; (svc || []).forEach((s) => (svcBy[s.workspace_id] ||= []).push(s.service_label));

  const leadIds = [...new Set(workspaces.map((w) => w.project_lead_id).filter(Boolean))];
  let leadName = {};
  if (leadIds.length) {
    const { data: leads } = await db.from("profiles").select("id,full_name,email").in("id", leadIds);
    (leads || []).forEach((l) => (leadName[l.id] = l.full_name || l.email));
  }

  const clients = workspaces.map((w) => ({
    ...w, services: svcBy[w.id] || [], project_lead_name: w.project_lead_id ? leadName[w.project_lead_id] : null,
  }));
  return Response.json({ clients, canAdd: me.isSuper });
}
