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
  const email = (body?.email || "").trim().toLowerCase();
  if (!email.endsWith("@welcometomorrow.io")) {
    return Response.json({ error: "This screen is for agency teammates (@welcometomorrow.io). To add a client, use the Clients screen." }, { status: 400 });
  }
  const fullName = (body?.fullName || "").trim();
  if (!email || !email.includes("@")) return Response.json({ error: "A valid email is required" }, { status: 400 });

  // where the invited person lands to set their password
  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
  const redirectTo = `${origin}/set-password`;

  const db = admin();
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  });
  if (error) {
    // common: user already exists
    return Response.json({ error: error.message }, { status: 400 });
  }
  const side = email.endsWith("@welcometomorrow.io") ? "agency" : "client";
  return Response.json({ ok: true, email, side });
}
