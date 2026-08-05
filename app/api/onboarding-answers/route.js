import { admin } from "../../../lib/supabaseAdmin";
import { callerFromReq } from "../../../lib/gsc";
import { INTAKE_STEPS } from "../../../lib/onboardingQuestions";

// GET ?workspaceId= : the effective form + this client's saved answers (super admin only)
export async function GET(req) {
  const { prof } = await callerFromReq(req);
  if (!prof?.is_super_admin) return Response.json({ error: "not allowed" }, { status: 403 });
  const ws = new URL(req.url).searchParams.get("workspaceId");
  if (!ws) return Response.json({ error: "missing workspace" }, { status: 400 });
  const db = admin();

  const { data: wk } = await db.from("workspaces").select("name,phase").eq("id", ws).maybeSingle();

  // effective form: client override -> default -> built-in base
  let form = null;
  const { data: co } = await db.from("onboarding_forms").select("definition").eq("workspace_id", ws).maybeSingle();
  if (co) form = co.definition;
  if (!form) { const { data: df } = await db.from("onboarding_forms").select("definition").is("workspace_id", null).maybeSingle(); if (df) form = df.definition; }
  if (!form) form = INTAKE_STEPS;

  const { data: resp } = await db.from("onboarding_responses").select("question_key,answer").eq("workspace_id", ws);
  const answers = {}; (resp || []).forEach((r) => { answers[r.question_key] = r.answer; });

  return Response.json({ ok: true, clientName: wk?.name || "Client", phase: wk?.phase || null, form, answers });
}
