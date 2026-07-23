import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function requireSuperAdmin(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("is_super_admin").eq("id", user.id).single();
  return prof?.is_super_admin ? user.id : null;
}

export async function POST(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const name = (body?.name || "").trim();
  const services = Array.isArray(body?.services) ? body.services : [];
  const leadEmail = (body?.leadEmail || "").trim().toLowerCase();
  if (!name) return Response.json({ error: "Client name is required" }, { status: 400 });
  if (!leadEmail || !leadEmail.includes("@")) return Response.json({ error: "The client lead's email is required" }, { status: 400 });

  const db = admin();

  // 1) create the client workspace
  const { data: ws, error: e1 } = await db
    .from("workspaces").insert({ name, is_demo: true }).select("id,name").single();
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  // 2) record the services they signed for
  if (services.length) {
    const rows = services.map((s) => ({
      workspace_id: ws.id, department: s.department,
      service_key: s.service_key, service_label: s.service_label,
    }));
    const { error: e2 } = await db.from("client_services").insert(rows);
    if (e2) return Response.json({ error: e2.message }, { status: 500 });
  }

  // 3) invite the client lead (creates their auth user + profile via trigger)
  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
  let leadId = null;
  const { data: inv, error: e3 } = await db.auth.admin.inviteUserByEmail(leadEmail, {
    data: { full_name: (body?.leadName || "").trim() },
    redirectTo: `${origin}/set-password`,
  });
  if (inv?.user?.id) leadId = inv.user.id;
  // if they already exist, invite errors  find their profile instead
  if (!leadId) {
    const { data: existing } = await db.from("profiles").select("id").eq("email", leadEmail).single();
    leadId = existing?.id || null;
  }

  // 4) make sure a profile exists, then link the lead to this client
  if (leadId) {
    await db.from("profiles").upsert(
      { id: leadId, email: leadEmail, side: leadEmail.endsWith("@welcometomorrow.io") ? "agency" : "client" },
      { onConflict: "id", ignoreDuplicates: true }
    );
    const { error: e5 } = await db.from("memberships").upsert(
      { profile_id: leadId, workspace_id: ws.id, is_client_lead: true },
      { onConflict: "profile_id,workspace_id", ignoreDuplicates: true }
    );
    if (e5) return Response.json({ error: e5.message }, { status: 500 });
  }

  return Response.json({ ok: true, client: ws, invited: leadEmail, leadLinked: !!leadId });
}

export async function GET(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  const db = admin();
  const { data: clients, error } = await db
    .from("workspaces").select("id,name,is_demo,onboarding_complete,created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: svc } = await db.from("client_services").select("workspace_id,service_label");
  const byWs = {};
  (svc || []).forEach((s) => { (byWs[s.workspace_id] ||= []).push(s.service_label); });
  const withServices = (clients || []).map((c) => ({ ...c, services: byWs[c.id] || [] }));
  return Response.json({ clients: withServices });
}
