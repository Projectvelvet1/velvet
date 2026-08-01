import { callerFromReq, gscAccessToken } from "../../../../lib/gsc";

export async function GET(req) {
  const { prof } = await callerFromReq(req);
  if (prof?.side !== "agency") return Response.json({ error: "not allowed" }, { status: 403 });
  const token = await gscAccessToken();
  if (!token) return Response.json({ connected: false, sites: [] });
  const r = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return Response.json({ connected: true, sites: [], error: (await r.text()).slice(0, 200) });
  const j = await r.json();
  const sites = (j.siteEntry || []).map((s) => s.siteUrl);
  return Response.json({ connected: true, sites });
}
