import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

// Marks a client's onboarding complete. Allowed if the caller is a MEMBER of
// that client (the client filling their own) or a super admin.
export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return Response.json({ error: "Not allowed" }, { status: 403 });
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const workspaceId = body?.workspaceId;
  const phase = body?.phase === "full" ? "full" : "discovery";
  if (!workspaceId) return Response.json({ error: "Missing client" }, { status: 400 });

  // verify membership (or super admin) using admin access, so RLS on memberships
  // can't wrongly block a client from completing their own onboarding.
  const db = admin();
  const { data: prof } = await db.from("profiles").select("is_super_admin").eq("id", user.id).single();
  let ok = !!prof?.is_super_admin;
  if (!ok) {
    const { data: mem } = await db.from("memberships").select("id").eq("profile_id", user.id).eq("workspace_id", workspaceId).maybeSingle();
    ok = !!mem;
  }
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 403 });
  const patch = phase === "full" ? { onboarding_complete: true } : { discovery_complete: true };
  const { error } = await db.from("workspaces").update(patch).eq("id", workspaceId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
