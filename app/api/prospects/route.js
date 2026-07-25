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

export async function POST(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const name = (body?.name || "").trim();
  const email = (body?.email || "").trim().toLowerCase();
  if (!name) return Response.json({ error: "Prospect name is required" }, { status: 400 });
  if (!email || !email.includes("@")) return Response.json({ error: "A valid email is required" }, { status: 400 });

  const db = admin();
  // create a prospect-phase workspace
  const { data: ws, error: e1 } = await db.from("workspaces")
    .insert({ name, is_demo: true, phase: "prospect" }).select("id,name").single();
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  // invite the prospect (they log in to protect their data)
  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
  let pid = null;
  const { data: inv } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/set-password` });
  pid = inv?.user?.id || null;
  if (!pid) { const { data: ex } = await db.from("profiles").select("id").eq("email", email).single(); pid = ex?.id || null; }
  if (pid) {
    await db.from("profiles").upsert({ id: pid, email, side: email.endsWith("@welcometomorrow.io") ? "agency" : "client" }, { onConflict: "id", ignoreDuplicates: true });
    await db.from("memberships").upsert({ profile_id: pid, workspace_id: ws.id, is_client_lead: true }, { onConflict: "profile_id,workspace_id", ignoreDuplicates: true });
  }

  // link the agency can use to open this client's dashboard (built in next sub-stage)
  const agencyLink = `${origin}/client/${ws.id}`;
  const loginLink = `${origin}/login`;
  return Response.json({ ok: true, client: ws, invited: email, agencyLink, loginLink });
}
