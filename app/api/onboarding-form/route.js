import { admin } from "../../../lib/supabaseAdmin";
import { callerFromReq } from "../../../lib/gsc";
import { INTAKE_STEPS } from "../../../lib/onboardingQuestions";

// GET ?workspaceId= : the EFFECTIVE form for this client (client override -> default -> code base)
export async function GET(req) {
  const { user, prof } = await callerFromReq(req);
  if (!user) return Response.json({ error: "not allowed" }, { status: 403 });
  const ws = new URL(req.url).searchParams.get("workspaceId");
  const db = admin();
  // must be agency or a member of the client
  if (!(prof?.is_super_admin || prof?.side === "agency")) {
    const { data: mem } = await db.from("memberships").select("id").eq("profile_id", user.id).eq("workspace_id", ws).maybeSingle();
    if (!mem) return Response.json({ error: "not allowed" }, { status: 403 });
  }
  let def = null, scope = "base";
  if (ws) { const { data } = await db.from("onboarding_forms").select("definition").eq("workspace_id", ws).maybeSingle(); if (data) { def = data.definition; scope = "client"; } }
  if (!def) { const { data } = await db.from("onboarding_forms").select("definition").is("workspace_id", null).maybeSingle(); if (data) { def = data.definition; scope = "default"; } }
  if (!def) { def = INTAKE_STEPS; scope = "base"; }
  return Response.json({ ok: true, scope, definition: def });
}

// POST { scope:'default'|'client', workspaceId?, definition } : save (super admin only)
export async function POST(req) {
  const { prof } = await callerFromReq(req);
  if (!prof?.is_super_admin) return Response.json({ error: "Only a super admin can edit onboarding questions." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const scope = body?.scope, def = body?.definition;
  if (!Array.isArray(def) || !def.length) return Response.json({ error: "The form can't be empty." }, { status: 400 });
  const wsId = scope === "client" ? (body?.workspaceId || null) : null;
  if (scope === "client" && !wsId) return Response.json({ error: "Pick a client for a client-only change." }, { status: 400 });
  const db = admin();
  // upsert keyed on the scope target
  const { data: existing } = wsId
    ? await db.from("onboarding_forms").select("id").eq("workspace_id", wsId).maybeSingle()
    : await db.from("onboarding_forms").select("id").is("workspace_id", null).maybeSingle();
  if (existing) await db.from("onboarding_forms").update({ definition: def, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await db.from("onboarding_forms").insert({ workspace_id: wsId, definition: def });
  return Response.json({ ok: true });
}
