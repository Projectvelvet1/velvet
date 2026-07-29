import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

const SVC_DEPT = { paid_media:"Performance", seo:"Performance", aso:"Performance", creative_strategy:"Content", asset_production:"Content", ugc:"Content", tracking:"Analytics", dashboarding:"Analytics" };
const DEPT_ORDER = ["Performance","Content","Analytics"];

async function agencyUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return null;
  const { data: prof } = await asUser.from("profiles").select("side,is_super_admin").eq("id", user.id).single();
  if (prof?.side !== "agency") return null;
  return { uid: user.id, isSuper: !!prof.is_super_admin };
}

export async function GET(req) {
  const me = await agencyUser(req);
  if (!me) return Response.json({ error: "Not allowed" }, { status: 403 });
  try {
  const db = admin();

  const CORE = "id,name,is_demo,phase,onboarding_complete,project_lead_id";
  const FULL = CORE + ",industry,website,start_date,lead_name,health,upsell,notes";
  let note = null;
  let { data: wss, error: selErr } = await db.from("workspaces").select(FULL).eq("phase","signed").eq("onboarding_complete", true);
  if (selErr) {
    // an optional column is missing in the DB; fall back to core columns so clients still show
    const retry = await db.from("workspaces").select(CORE).eq("phase","signed").eq("onboarding_complete", true);
    wss = (retry.data || []).map((w) => ({ ...w, industry:null, website:null, start_date:null, lead_name:null, health:"healthy", upsell:"", notes:"" }));
    note = "Some client fields aren't in the database yet. Run velvet-ensure-schema.sql to add them.";
  }
  let active = wss || [];
  if (!me.isSuper) active = active.filter((w) => w.project_lead_id === me.uid);

  if (active.length === 0) {
    // diagnostics: help pinpoint why nothing is active
    const { count: signedCount } = await db.from("workspaces").select("id", { count: "exact", head: true }).eq("phase","signed");
    const { count: onbCount } = await db.from("workspaces").select("id", { count: "exact", head: true }).eq("phase","signed").eq("onboarding_complete", true);
    if (!note) {
      if ((signedCount || 0) > 0 && (onbCount || 0) === 0) note = `You have ${signedCount} signed client(s), but none are marked onboarding-complete. If a client finished onboarding, run velvet-fix-onboarding.sql to mark them complete.`;
      else if ((onbCount || 0) > 0 && !me.isSuper) note = "There are active clients, but none are led by you.";
    }
    return Response.json({ clients: [], isSuper: me.isSuper, note });
  }

  const ids = active.map((w) => w.id);
  const leadIds = [...new Set(active.map((w) => w.project_lead_id).filter(Boolean))];

  const { data: svcs } = await db.from("client_services").select("workspace_id,service_key,service_label").in("workspace_id", ids);
  const { data: asg } = await db.from("service_assignments").select("workspace_id,service_key,profile_id").in("workspace_id", ids);
  const profIds = [...new Set([...(asg||[]).map(a=>a.profile_id), ...leadIds])];
  const { data: profs } = profIds.length ? await db.from("profiles").select("id,full_name,email").in("id", profIds) : { data: [] };
  const nameOf = (id) => { const p=(profs||[]).find(x=>x.id===id); return p ? (p.full_name || p.email) : "Unknown"; };
  const { data: subs } = await db.from("feedback_submissions").select("workspace_id,overall_score,created_at").in("workspace_id", ids).order("created_at",{ascending:false});

  const clients = active.map((w) => {
    const services = (svcs||[]).filter(s=>s.workspace_id===w.id);
    // team grouped by department
    const byDept = {};
    (asg||[]).filter(a=>a.workspace_id===w.id).forEach(a=>{
      const dept = SVC_DEPT[a.service_key] || "Other";
      const label = services.find(s=>s.service_key===a.service_key)?.service_label || a.service_key;
      (byDept[dept] = byDept[dept] || []).push(`${nameOf(a.profile_id)} (${label})`);
    });
    const team = DEPT_ORDER.filter(d=>byDept[d]).map(d=>({ dept:d, members:[...new Set(byDept[d])] }));
    const fb = (subs||[]).find(s=>s.workspace_id===w.id) || null;
    return {
      id: w.id, name: w.name, is_demo: w.is_demo, industry: w.industry, website: w.website, start_date: w.start_date,
      lead_name: w.lead_name || (w.project_lead_id ? nameOf(w.project_lead_id) : null),
      health: w.health || "healthy", upsell: w.upsell || "", notes: w.notes || "",
      services: services.map(s=>s.service_label),
      team, feedback: fb ? { overall: fb.overall_score, date: fb.created_at } : null,
      canEditMeta: me.isSuper || w.project_lead_id === me.uid,
    };
  });
  return Response.json({ clients, isSuper: me.isSuper, note });
  } catch (e) {
    return Response.json({ clients: [], isSuper: me.isSuper, debug: "Server error: " + (e?.message || String(e)) });
  }
}
