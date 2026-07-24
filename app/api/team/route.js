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
  const id = body?.id;
  if (!id) return Response.json({ error: "Missing person" }, { status: 400 });
  const db = admin();
  const update = {
    full_name: (body?.fullName ?? "").trim() || null,
    job_title: (body?.jobTitle ?? "").trim() || null,
    home_department: body?.homeDepartment || null,
  };
  // Only touch is_super_admin if the caller actually sent it, so this
  // route still works for plain profile edits that don't include it.
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "isSuperAdmin")) {
    // Prevent a super admin from locking themselves out by demoting
    // their own account through this screen.
    if (id === uid && !body.isSuperAdmin) {
      return Response.json({ error: "You can't remove your own super admin access." }, { status: 400 });
    }
    update.is_super_admin = !!body.isSuperAdmin;
  }
  const { error } = await db.from("profiles").update(update).eq("id", id).eq("side", "agency");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
