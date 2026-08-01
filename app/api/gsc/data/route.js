import { admin } from "../../../../lib/supabaseAdmin";
import { callerFromReq, gscAccessToken } from "../../../../lib/gsc";

function ymd(d) { return d.toISOString().slice(0, 10); }

export async function GET(req) {
  const { user, prof } = await callerFromReq(req);
  if (!user) return Response.json({ ok: false, reason: "not_allowed" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const ws = sp.get("workspaceId");
  const days = Math.max(1, Math.min(400, parseInt(sp.get("days") || "90", 10)));
  const wantSeries = sp.get("series") === "1";

  const db = admin();
  const { data: mem } = await db.from("memberships").select("id").eq("profile_id", user.id).eq("workspace_id", ws).maybeSingle();
  if (!(prof?.is_super_admin || mem)) return Response.json({ ok: false, reason: "not_allowed" }, { status: 403 });

  const { data: cp } = await db.from("client_gsc_property").select("property").eq("workspace_id", ws).maybeSingle();
  if (!cp?.property) return Response.json({ ok: false, reason: "no_property" });
  const token = await gscAccessToken();
  if (!token) return Response.json({ ok: false, reason: "not_connected" });

  const end = new Date(); end.setDate(end.getDate() - 3);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(cp.property)}/searchAnalytics/query`;
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const totalsRes = await fetch(url, { method: "POST", headers: H, body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end) }) });
  if (!totalsRes.ok) return Response.json({ ok: false, reason: "gsc_error", message: (await totalsRes.text()).slice(0, 200) });
  const tj = await totalsRes.json();
  const row = (tj.rows && tj.rows[0]) || {};
  const totals = { clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 };

  let series = null;
  if (wantSeries) {
    const sRes = await fetch(url, { method: "POST", headers: H, body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), dimensions: ["date"], rowLimit: 500 }) });
    if (sRes.ok) { const sj = await sRes.json(); series = (sj.rows || []).map((r) => ({ date: r.keys[0], clicks: r.clicks || 0 })); }
  }
  return Response.json({ ok: true, property: cp.property, totals, series });
}
