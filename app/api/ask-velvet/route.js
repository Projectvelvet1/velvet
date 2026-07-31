import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
import { SOURCES } from "../../../lib/sources";
export const dynamic = "force-dynamic";

async function caller(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
  return user || null;
}
function domainOf(x) { return (x || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim(); }

async function ahrefsOverview(key, domain) {
  const date = new Date().toISOString().slice(0, 10);
  const H = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const base = "https://api.ahrefs.com/v3/site-explorer";
  const q = (o) => new URLSearchParams(o).toString();
  try {
    const [dr, mx, bl] = await Promise.all([
      fetch(`${base}/domain-rating?${q({ target: domain, date })}`, { headers: H }),
      fetch(`${base}/metrics?${q({ target: domain, date, mode: "subdomains", protocol: "both" })}`, { headers: H }),
      fetch(`${base}/backlinks-stats?${q({ target: domain, date, mode: "subdomains", protocol: "both" })}`, { headers: H }),
    ]);
    const drj = dr.ok ? await dr.json() : null, mxj = mx.ok ? await mx.json() : null, blj = bl.ok ? await bl.json() : null;
    return { domain, org_traffic: mxj?.metrics?.org_traffic ?? null, org_keywords: mxj?.metrics?.org_keywords ?? null, domain_rating: drj?.domain_rating?.domain_rating ?? null, backlinks: blj?.metrics?.live ?? null };
  } catch { return { domain, error: true }; }
}

export async function POST(req) {
  const user = await caller(req);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });
  const db = admin();
  const { data: prof } = await db.from("profiles").select("side,is_super_admin,full_name").eq("id", user.id).single();
  if (prof?.side !== "agency") return Response.json({ error: "Ask Velvet is for the agency team." }, { status: 403 });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return Response.json({ error: "The AI key isn't set on the server (ANTHROPIC_API_KEY)." }, { status: 500 });
  const ahrefsKey = process.env.AHREFS_API_KEY;

  let body; try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  let msgs = Array.isArray(body?.messages) ? body.messages : (body?.question ? [{ role: "user", content: body.question }] : []);
  msgs = msgs.filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .map((m) => ({ role: m.role, content: String(m.content).trim() })).slice(-16);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return Response.json({ error: "Ask a question first." }, { status: 400 });
  const providedContext = typeof body?.context === "string" && body.context.trim() ? body.context.trim() : null;
  const allUserText = msgs.filter((m) => m.role === "user").map((m) => m.content).join(" ").toLowerCase();

  // the caller's clients
  const { data: asg } = await db.from("service_assignments").select("workspace_id").eq("profile_id", user.id);
  let wsIds = [...new Set((asg || []).map((a) => a.workspace_id))];
  if (prof?.is_super_admin) {
    const { data: allws } = await db.from("workspaces").select("id").limit(8);
    wsIds = [...new Set([...wsIds, ...((allws || []).map((w) => w.id))])];
  }
  wsIds = wsIds.slice(0, 6);
  const { data: wss } = wsIds.length ? await db.from("workspaces").select("id,name,website").in("id", wsIds) : { data: [] };

  // caller's service(s) + per-service training and declared sources
  const { data: myAsg } = await db.from("service_assignments").select("service_key").eq("profile_id", user.id);
  const svcKeys = [...new Set((myAsg || []).map((a) => a.service_key))];
  let guidance = [], declaredSrc = [];
  if (svcKeys.length) {
    const { data: g } = await db.from("service_guidance").select("kind,content").in("service_key", svcKeys);
    guidance = (g || []).filter((x) => x.kind === "note").map((x) => x.content);
    declaredSrc = [...new Set((g || []).filter((x) => x.kind === "source").map((x) => x.content))];
  }
  const declared = SOURCES.filter((s2) => declaredSrc.includes(s2.key));
  const connLabels = declared.filter((s2) => s2.connected).map((s2) => s2.label);
  const offLabels = declared.filter((s2) => !s2.connected).map((s2) => s2.label);

  const named = (providedContext ? null : (wss || []).find((w) => w.name && allUserText.includes(w.name.toLowerCase())));
  const focus = named ? [named] : (wss || []).slice(0, 4);

  const ah = [];
  if (!providedContext && ahrefsKey) {
    for (const w of focus) { if (w.website) ah.push({ name: w.name, ...(await ahrefsOverview(ahrefsKey, domainOf(w.website))) }); }
    if (named) {
      const { data: comps } = await db.from("competitors").select("name").eq("workspace_id", named.id).limit(4);
      for (const c of (comps || [])) { const d = domainOf(c.name); if (d.includes(".")) ah.push({ name: c.name + " (competitor of " + named.name + ")", ...(await ahrefsOverview(ahrefsKey, d)) }); }
    }
  }

  const { data: tasks } = providedContext ? { data: [] } : await db.from("tasks").select("title,status,workspace_id,updated_at,due_date").eq("assignee_id", user.id).limit(60);
  const nameOf = (id) => { const w = (wss || []).find((x) => x.id === id); return w ? w.name : "(no client)"; };
  const taskLines = (tasks || []).map((t) => `- ${t.title} [${t.status}] client:${nameOf(t.workspace_id)}${t.due_date ? " due:" + t.due_date : ""}${t.updated_at ? " updated:" + String(t.updated_at).slice(0, 10) : ""}`);

  const ctx = providedContext || [
    "AHREFS DATA (current):",
    ...(ah.length ? ah.map((a) => a.error ? `- ${a.name}: (no data available)` : `- ${a.name}: organic traffic ${a.org_traffic}, organic keywords ${a.org_keywords}, Domain Rating ${a.domain_rating}, backlinks ${a.backlinks}`) : ["- (no Ahrefs data available)"]),
    "",
    "THIS TEAM MEMBER'S TASKS:",
    ...(taskLines.length ? taskLines : ["- (no tasks)"]),
  ].join("\n");

  const styleBlock = guidance.length ? guidance.join("\n---\n") : "(no department guidance set, use a neutral, concise style)";
  const srcBlock = [
    "Connected sources you may use: " + (connLabels.length ? connLabels.join(", ") : "Ahrefs, Velvet tasks"),
    "Requested but NOT connected (if asked for this data, say we don't have it because that source isn't connected yet): " + (offLabels.length ? offLabels.join(", ") : "(none)"),
  ].join("\n");

  const SYS = `You are Ask Velvet, the assistant for a marketing agency's team, in an ongoing chat with a team member about their clients. Be conversational, warm and concise. Answer using ONLY the data below and the conversation so far. If a specific number or fact is not present, say you don't have that data rather than guessing, and offer what you can. If a request is ambiguous, ask a short clarifying question. Never invent metrics, dates, or trends. Today is ${new Date().toISOString().slice(0, 10)}.

HOW THIS DEPARTMENT WANTS ANSWERS (follow this style):
${styleBlock}

DATA SOURCES:
${srcBlock}

DATA:
${ctx}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 900, system: SYS, messages: msgs }),
    });
    if (!r.ok) { const t = await r.text(); return Response.json({ error: "AI request failed", detail: t.slice(0, 200) }, { status: 502 }); }
    const data = await r.json();
    const answer = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return Response.json({ ok: true, answer, context: ctx, used: { clients: focus.map((f) => f.name), ahrefs: ah.length, tasks: (tasks || []).length } });
  } catch (e) {
    return Response.json({ error: "AI error: " + (e?.message || String(e)) }, { status: 502 });
  }
}
