import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

async function verifyPassword(email, password) {
  if (!email || !password) return false;
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error } = await c.auth.signInWithPassword({ email, password });
  return !error;
}

// Returns the caller's { uid, email } if super admin, else null.
async function superAdminUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("is_super_admin").eq("id", user.id).single();
  return prof?.is_super_admin ? { uid: user.id, email: user.email } : null;
}

async function requireSuperAdmin(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("is_super_admin").eq("id", user.id).single();
  return prof?.is_super_admin ? user.id : null;
}

export async function POST(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const id = body?.id;
  if (!id) return Response.json({ error: "Missing person" }, { status: 400 });
  const db = admin();
  const { error } = await db.from("profiles").update({
    full_name: (body?.fullName ?? "").trim() || null,
    job_title: (body?.jobTitle ?? "").trim() || null,
    home_department: body?.homeDepartment || null,
  }).eq("id", id).eq("side", "agency");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const me = await superAdminUser(req);
  if (!me) return Response.json({ error: "Not allowed" }, { status: 403 });
  const uid = me.uid;
  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const id = body?.id;
  if (!id) return Response.json({ error: "Missing person" }, { status: 400 });
  if (id === uid) return Response.json({ error: "You can't remove yourself." }, { status: 400 });
  if (!body?.password) return Response.json({ error: "Password required" }, { status: 400 });
  const ok = await verifyPassword(me.email, body.password);
  if (!ok) return Response.json({ error: "Incorrect password. Nothing was deleted." }, { status: 403 });
  const db = admin();
  // guard: a person who leads a client can't be removed until the lead is reassigned
  const { data: leads } = await db.from("workspaces").select("id,name").eq("project_lead_id", id);
  if (leads && leads.length) {
    return Response.json({ error: `This person leads ${leads.length} client(s) (e.g. ${leads[0].name}). Reassign the project lead first.` }, { status: 400 });
  }
  await db.from("service_assignments").delete().eq("profile_id", id);
  await db.from("memberships").delete().eq("profile_id", id);
  await db.from("profiles").delete().eq("id", id);
  try { await db.auth.admin.deleteUser(id); } catch (e) {}
  return Response.json({ ok: true });
}
