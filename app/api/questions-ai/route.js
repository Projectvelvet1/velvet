import { createClient } from "@supabase/supabase-js";
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

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "The AI key isn't set up on the server yet (ANTHROPIC_API_KEY)." }, { status: 500 });

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const raw = (body?.text || "").trim();
  const phase = body?.phase === "full" ? "full" : "discovery";
  if (!raw) return Response.json({ error: "Paste some questions first" }, { status: 400 });
  if (raw.length > 8000) return Response.json({ error: "That's a lot of text — please shorten it a little." }, { status: 400 });

  const context = phase === "full"
    ? "These are onboarding questions for a NEW SIGNED CLIENT of a marketing agency (deeper questions about their company, offers, audience, channels)."
    : "These are DISCOVERY questions for a PROSPECT (a lead not yet signed) of a marketing agency (their goals, challenges, and situation).";

  const system = `You organise rough onboarding questions into a clean, ordered set for a marketing agency's client portal. ${context}
Return ONLY valid JSON, no prose, no markdown fences. Shape:
{"questions":[{"label":"the question text","helper":"a short optional hint or empty string","answer_type":"text or textarea"}]}
Rules: keep the user's intent; merge duplicates; fix grammar; order logically; use "textarea" for open-ended answers and "text" for short ones; 3 to 15 questions.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5", max_tokens: 1500, system,
        messages: [{ role: "user", content: `Organise these into the JSON set:\n\n${raw}` }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return Response.json({ error: "AI request failed", detail: t.slice(0, 300) }, { status: 502 });
    }
    const data = await r.json();
    let txt = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    txt = txt.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    let parsed; try { parsed = JSON.parse(txt); } catch { return Response.json({ error: "AI returned something we couldn't read. Try again." }, { status: 502 }); }
    const questions = Array.isArray(parsed?.questions) ? parsed.questions
      .filter((q) => (q?.label || "").trim())
      .map((q) => ({ label: String(q.label).trim(), helper: String(q.helper || "").trim(), answer_type: q.answer_type === "textarea" ? "textarea" : "text" }))
      : [];
    if (!questions.length) return Response.json({ error: "No questions could be organised from that text." }, { status: 502 });
    return Response.json({ ok: true, questions });
  } catch (e) {
    return Response.json({ error: "Could not reach the AI service." }, { status: 502 });
  }
}
