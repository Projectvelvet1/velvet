import { callerFromReq, gscAccessToken } from "../../../../lib/gsc";

export async function GET(req) {
  const { prof } = await callerFromReq(req);
  if (prof?.side !== "agency") return Response.json({ error: "not allowed" }, { status: 403 });
  const token = await gscAccessToken();
  if (!token) return Response.json({ connected: false, sites: [], error: "No valid Google token — reconnect in Settings → Data connections." });

  // canonical Search Console sites.list
  const r = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${token}` } });
  const text = await r.text();
  if (!r.ok) return Response.json({ connected: true, sites: [], error: `Google (${r.status}): ${text.slice(0, 300)}` });
  let j = {}; try { j = JSON.parse(text); } catch {}
  const sites = (j.siteEntry || []).map((s) => s.siteUrl);
  return Response.json({ connected: true, sites, error: sites.length ? null : "Google returned no properties for this account." });
}
