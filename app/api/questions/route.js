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
function slug(s) { return (s || "q").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "q"; }

export async function POST(req) {
  const uid = await requireSuperAdmin(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const phase = body?.phase === "full" ? "full" : "discovery";
  const incoming = Array.isArray(body?.questions) ? body.questions : [];

  const db = admin();
  const { data: existing } = await db.from("onboarding_questions").select("id,question_key").eq("phase", phase);
  const existingIds = new Set((existing || []).map((r) => r.id));
  const keepIds = new Set(incoming.filter((q) => q.id).map((q) => q.id));

  // delete removed
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length) await db.from("onboarding_questions").delete().in("id", toDelete);

  // upsert each (keep stable question_key; generate for new)
  const usedKeys = new Set();
  let i = 0;
  for (const q of incoming) {
    i += 1;
    const label = (q.label || "").trim();
    if (!label) continue;
    let key = q.question_key;
    if (!key) { key = slug(label) + "_" + Math.random().toString(36).slice(2, 6); }
    while (usedKeys.has(key)) key = key + "_x";
    usedKeys.add(key);
    const row = { phase, question_key: key, label, helper: (q.helper || "").trim(), answer_type: q.answer_type === "textarea" ? "textarea" : "text", sort_order: i };
    if (q.id) await db.from("onboarding_questions").update(row).eq("id", q.id);
    else await db.from("onboarding_questions").insert(row);
  }
  const { data: fresh } = await db.from("onboarding_questions").select("id,question_key,label,helper,answer_type,sort_order").eq("phase", phase).order("sort_order");
  return Response.json({ ok: true, questions: fresh || [] });
}
