import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

async function validUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser(token);
  return user || null;
}

function domainOf(input) {
  let d = (input || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
  return d;
}

export async function GET(req) {
  const user = await validUser(req);
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });
  const key = process.env.AHREFS_API_KEY;
  if (!key) return Response.json({ error: "no_key", message: "Ahrefs API key not set on the server (AHREFS_API_KEY)." }, { status: 200 });

  const target = domainOf(new URL(req.url).searchParams.get("target"));
  if (!target) return Response.json({ error: "no_target", message: "This client has no website set." }, { status: 200 });

  const date = new Date().toISOString().slice(0, 10);
  const H = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const base = "https://api.ahrefs.com/v3/site-explorer";
  const q = (o) => new URLSearchParams(o).toString();
  const kind = new URL(req.url).searchParams.get("kind") || "overview";

  if (kind === "keywords") {
    try {
      const r = await fetch(`${base}/organic-keywords?${q({ target, date, mode: "subdomains", protocol: "both", limit: "5", order_by: "sum_traffic:desc", select: "keyword,sum_traffic,best_position,volume" })}`, { headers: H });
      if (!r.ok) return Response.json({ error: "ahrefs_failed", message: (await r.text()).slice(0, 200) }, { status: 200 });
      const j = await r.json();
      return Response.json({ ok: true, keywords: (j.keywords || []).map((k) => ({ keyword: k.keyword, traffic: k.sum_traffic, position: k.best_position })) });
    } catch (e) { return Response.json({ error: "ahrefs_error", message: e?.message || String(e) }, { status: 200 }); }
  }
  if (kind === "pages") {
    try {
      const r = await fetch(`${base}/top-pages?${q({ target, date, mode: "subdomains", protocol: "both", limit: "5", order_by: "sum_traffic:desc", select: "url,sum_traffic,top_keyword" })}`, { headers: H });
      if (!r.ok) return Response.json({ error: "ahrefs_failed", message: (await r.text()).slice(0, 200) }, { status: 200 });
      const j = await r.json();
      return Response.json({ ok: true, pages: (j.pages || []).map((x) => ({ url: x.url, traffic: x.sum_traffic, top_keyword: x.top_keyword })) });
    } catch (e) { return Response.json({ error: "ahrefs_error", message: e?.message || String(e) }, { status: 200 }); }
  }

  if (kind === "history") {
    const sp = new URL(req.url).searchParams;
    const grouping = sp.get("grouping") || "monthly";
    const date_from = sp.get("date_from") || "2024-01-01";
    try {
      const r = await fetch(`${base}/metrics-history?${q({ target, date_from, history_grouping: grouping, mode: "subdomains", protocol: "both", select: "date,org_traffic" })}`, { headers: H });
      if (!r.ok) return Response.json({ error: "ahrefs_failed", message: (await r.text()).slice(0, 200) }, { status: 200 });
      const j = await r.json();
      const rows = Array.isArray(j?.metrics) ? j.metrics : Array.isArray(j?.rows) ? j.rows : Array.isArray(j) ? j : [];
      const series = rows.map((x) => ({ date: x.date, org_traffic: x.org_traffic ?? null, org_keywords: null })).filter((x) => x.date);
      return Response.json({ ok: true, target, grouping, series });
    } catch (e) { return Response.json({ error: "ahrefs_error", message: e?.message || String(e) }, { status: 200 }); }
  }

  try {
    const [dr, mx, bl] = await Promise.all([
      fetch(`${base}/domain-rating?${q({ target, date })}`, { headers: H }),
      fetch(`${base}/metrics?${q({ target, date, mode: "subdomains", protocol: "both" })}`, { headers: H }),
      fetch(`${base}/backlinks-stats?${q({ target, date, mode: "subdomains", protocol: "both" })}`, { headers: H }),
    ]);
    if (!dr.ok && !mx.ok && !bl.ok) {
      const detail = await dr.text().catch(() => "");
      return Response.json({ error: "ahrefs_failed", message: "Ahrefs request failed.", detail: detail.slice(0, 200) }, { status: 200 });
    }
    const drj = dr.ok ? await dr.json() : null;
    const mxj = mx.ok ? await mx.json() : null;
    const blj = bl.ok ? await bl.json() : null;
    return Response.json({
      ok: true, target,
      org_traffic: mxj?.metrics?.org_traffic ?? null,
      org_keywords: mxj?.metrics?.org_keywords ?? null,
      domain_rating: drj?.domain_rating?.domain_rating ?? null,
      backlinks: blj?.metrics?.live ?? null,
    });
  } catch (e) {
    return Response.json({ error: "ahrefs_error", message: e?.message || String(e) }, { status: 200 });
  }
}
