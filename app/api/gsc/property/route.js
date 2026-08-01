import { admin } from "../../../../lib/supabaseAdmin";
import { callerFromReq } from "../../../../lib/gsc";

async function isMember(db, uid, ws) {
  const { data } = await db.from("memberships").select("id").eq("profile_id", uid).eq("workspace_id", ws).maybeSingle();
  return !!data;
}

export async function GET(req) {
  const { user, prof } = await callerFromReq(req);
  if (!user) return Response.json({ error: "not allowed" }, { status: 403 });
  const ws = new URL(req.url).searchParams.get("workspaceId");
  const db = admin();
  if (!(prof?.is_super_admin || await isMember(db, user.id, ws))) return Response.json({ error: "not allowed" }, { status: 403 });
  const { data } = await db.from("client_gsc_property").select("property").eq("workspace_id", ws).maybeSingle();
  return Response.json({ property: data?.property || null });
}

export async function POST(req) {
  const { user, prof } = await callerFromReq(req);
  if (prof?.side !== "agency") return Response.json({ error: "Only agency members can set the property." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ws = body?.workspaceId, property = body?.property;
  if (!ws || !property) return Response.json({ error: "Missing workspace or property." }, { status: 400 });
  const db = admin();
  if (!(prof?.is_super_admin || await isMember(db, user.id, ws))) return Response.json({ error: "not allowed" }, { status: 403 });
  await db.from("client_gsc_property").upsert({ workspace_id: ws, property, set_by: user.id, updated_at: new Date().toISOString() });
  return Response.json({ ok: true });
}
