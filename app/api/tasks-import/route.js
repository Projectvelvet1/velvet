import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

async function agencyUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("side").eq("id", user.id).single();
  return prof?.side === "agency" ? user.id : null;
}

const SYS = `You read an agency worker's rough worklist and turn it into clean tasks.
The list may have clients/companies as headings and tasks as bullets under each heading.
Return ONLY valid JSON, no prose, no markdown fences. Shape:
{"tasks":[{"client":"client or company name if the task sits under one, else empty string","title":"the task, tidied into a short clear sentence"}]}
Rules: one object per task/bullet; keep the user's intent; fix grammar; if there are no client headings, leave client as "". 1 to 60 tasks.`;

export async function POST(req) {
  const uid = await agencyUser(req);
  if (!uid) return Response.json({ error: "Not allowed" }, { status: 403 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "The AI key isn't set up on the server (ANTHROPIC_API_KEY)." }, { status: 500 });

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const source = body?.source;
  let content;
  if (source === "text") {
    const raw = (body?.text || "").trim();
    if (!raw) return Response.json({ error: "Paste or upload a worklist first." }, { status: 400 });
    if (raw.length > 12000) return Response.json({ error: "That's a lot of text — shorten it a little." }, { status: 400 });
    content = `Turn this worklist into the JSON:\n\n${raw}`;
  } else if (source === "image") {
    content = [
      { type: "image", source: { type: "base64", media_type: body.media_type || "image/png", data: body.data } },
      { type: "text", text: "Turn this worklist image into the JSON described." },
    ];
  } else if (source === "pdf") {
    content = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: body.data } },
      { type: "text", text: "Turn this worklist document into the JSON described." },
    ];
  } else {
    return Response.json({ error: "Unsupported file. Use text, an image, or a PDF." }, { status: 400 });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 2500, system: SYS, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) { const t = await r.text(); return Response.json({ error: "AI request failed", detail: t.slice(0, 300) }, { status: 502 }); }
    const data = await r.json();
    let txt = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    txt = txt.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    let parsed; try { parsed = JSON.parse(txt); } catch { return Response.json({ error: "AI returned something unreadable. Try again." }, { status: 502 }); }
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks
      .filter((t) => (t?.title || "").trim())
      .map((t) => ({ client: String(t.client || "").trim(), title: String(t.title).trim() })) : [];
    if (!tasks.length) return Response.json({ error: "No tasks could be read from that." }, { status: 502 });
    return Response.json({ ok: true, tasks });
  } catch (e) {
    return Response.json({ error: "AI request error: " + (e?.message || String(e)) }, { status: 502 });
  }
}
