import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Confirm the request comes from a signed-in super admin.
// We read the caller's access token from the Authorization header, ask Supabase
// who they are, then check their profile. Returns the user id, or null.
async function requireSuperAdmin(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const asUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return null;

  const { data: prof } = await asUser
    .from("profiles").select("is_super_admin").eq("id", user.id).single();
  return prof?.is_super_admin ? user.id : null;
}

export async function POST(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const name = (body?.name || "").trim();
  const services = Array.isArray(body?.services) ? body.services : [];
  if (!name) return Response.json({ error: "Client name is required" }, { status: 400 });

  const db = admin();
  // 1) create the workspace (client)
  const { data: ws, error: e1 } = await db
    .from("workspaces").insert({ name, is_demo: true }).select("id,name").single();
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  // 2) link the creating super admin to it as client lead, so it shows for them
  const { error: e2 } = await db.from("memberships").insert({
    profile_id: uid, workspace_id: ws.id, is_client_lead: true,
  });
  if (e2) return Response.json({ error: e2.message }, { status: 500 });

  // (services are captured now; we store them properly when we build that table)
  return Response.json({ ok: true, client: ws, services });
}

export async function GET(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  const db = admin();
  const { data, error } = await db
    .from("workspaces").select("id,name,is_demo,onboarding_complete,created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ clients: data });
}
