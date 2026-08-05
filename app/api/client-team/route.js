import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

const SVC_DEPT = { paid_media:"Performance", seo:"Performance", aso:"Performance", creative_strategy:"Content", asset_production:"Content", ugc:"Content", tracking:"Analytics", dashboarding:"Analytics" };

async function caller(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  return user || null;
}
async function isMember(db, uid, workspaceId) {
  const { data: prof } = await db.from("profiles").select("is_super_admin").eq("id", uid).single();
  if (prof?.is_super_admin) return true;
  const { data: mem } = await db.from("memberships").select("id").eq("profile_id", uid).eq("workspace_id", workspaceId).maybeSingle();
  return !!mem;
}

async function buildTeam(db, workspaceId) {
  const { data: svcs } = await db.from("client_services").select("service_key,service_label").eq("workspace_id", workspaceId);
  const { data: mem } = await db.from("memberships").select("profile_id,client_service").eq("workspace_id", workspaceId);
  const memIds = [...new Set((mem || []).map((m) => m.profile_id))];
  const { data: profs } = memIds.length ? await db.from("profiles").select("id,full_name,email,side").in("id", memIds) : { data: [] };
  const nameOf = (id) => { const p = (profs || []).find((x) => x.id === id); return p ? (p.full_name || p.email) : "Unknown"; };
  const { data: asg } = await db.from("service_assignments").select("service_key,profile_id").eq("workspace_id", workspaceId);

  const agencyPeople = (profs || []).filter((p) => p.side === "agency").map((p) => ({ id: p.id, name: p.full_name || p.email }));
  const clientPeople = (profs || []).filter((p) => p.side === "client").map((p) => ({ id: p.id, name: p.full_name || p.email }));
  const clientTeam = (profs || []).filter((p) => p.side === "client").map((p) => ({ id: p.id, name: p.full_name || p.email, email: p.email, service: (mem || []).find((m) => m.profile_id === p.id)?.client_service || null }));

  const byService = (svcs || []).map((s) => ({
    service_key: s.service_key, service_label: s.service_label, department: SVC_DEPT[s.service_key] || "",
    people: (asg || []).filter((a) => a.service_key === s.service_key).map((a) => ({ id: a.profile_id, name: nameOf(a.profile_id) })),
  }));

  return { services: svcs || [], agencyByService: byService, clientTeam, agencyPeople, clientPeople };
}

export async function GET(req) {
  const user = await caller(req);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) return Response.json({ error: "Missing client" }, { status: 400 });
  const db = admin();
  if (!(await isMember(db, user.id, workspaceId))) return Response.json({ error: "Not allowed" }, { status: 403 });
  return Response.json({ ok: true, ...(await buildTeam(db, workspaceId)) });
}

export async function POST(req) {
  const user = await caller(req);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const workspaceId = body?.workspaceId;
  const email = (body?.email || "").trim().toLowerCase();
  const fullName = (body?.fullName || "").trim();
  const service = body?.service || null;
  if (!workspaceId || !email || !email.includes("@")) return Response.json({ error: "Name, a valid email and a service are needed." }, { status: 400 });
  const db = admin();
  if (!(await isMember(db, user.id, workspaceId))) return Response.json({ error: "Not allowed" }, { status: 403 });
  if (email.endsWith("@welcometomorrow.io")) return Response.json({ error: "That's an agency email. Add client teammates with their company email." }, { status: 400 });

  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
  const redirectTo = `${origin}/set-password`;
  let userId = null;
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo });
  if (error) {
    const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!existing) return Response.json({ error: error.message }, { status: 400 });
    userId = existing.id;
  } else { userId = data?.user?.id; }
  if (userId) {
    await db.from("profiles").upsert({ id: userId, email, side: "client", full_name: fullName || null }, { onConflict: "id" });
    await db.from("memberships").upsert({ profile_id: userId, workspace_id: workspaceId, client_service: service }, { onConflict: "profile_id,workspace_id" });
  }
  return Response.json({ ok: true, email });
}
