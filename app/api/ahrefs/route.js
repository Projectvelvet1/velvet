import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

async function validUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
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
