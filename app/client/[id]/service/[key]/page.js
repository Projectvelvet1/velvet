"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import Shell from "../../../../../components/Shell";
import AgencyNav from "../../../../../components/AgencyNav";
import Modal from "../../../../../components/Modal";
import AddTask from "../../../../../components/AddTask";
import AssignTask from "../../../../../components/AssignTask";
import AskVelvet from "../../../../../components/AskVelvet";
import TaskDetail from "../../../../../components/TaskDetail";
import { loadAgencyDepts, DEPARTMENTS } from "../../../../../lib/agencyNav";

export const dynamic = "force-dynamic";

const DEMO_ITEMS = [
  { t: "Technical audit fixes", s: "In progress", bg: "#FFF3D6", fg: "#9A6B00" },
  { t: "Schema markup for /aviator", s: "To do", bg: "#EEF0FF", fg: "#3B49C7" },
  { t: "Meta descriptions rewrite", s: "Delivered", bg: "#E7F0FF", fg: "#2557C7" },
  { t: "Backlink cleanup", s: "Needs another look", bg: "#FDEBD3", fg: "#B4640C" },
];
function ymd(d) { return d.toISOString().slice(0, 10); }
function quarterBounds(year, q) { const s = new Date(year, (q - 1) * 3, 1); const e = new Date(year, q * 3, 0); return [ymd(s), ymd(e)]; }
function tabBounds(tab, qYear, qQuarter) {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  if (tab === "today") { const t = ymd(now); return [t, t]; }
  if (tab === "this_week") { const day = (now.getDay() + 6) % 7; const mon = new Date(now); mon.setDate(now.getDate() - day); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return [ymd(mon), ymd(sun)]; }
  if (tab === "this_month") { return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))]; }
  if (tab === "this_quarter") { return quarterBounds(qYear, qQuarter); }
  return null; // all
}
const STATUS = {
  todo: { label: "To do", bg: "#EEF0FF", fg: "#3B49C7" },
  in_progress: { label: "In progress", bg: "#FFF3D6", fg: "#9A6B00" },
  delivered: { label: "Delivered", bg: "#E7F0FF", fg: "#2557C7" },
  reviewed: { label: "Reviewed", bg: "#E4F6EC", fg: "#177E4E" },
  needs_look: { label: "Needs another look", bg: "#FDEBD3", fg: "#B4640C" },
};

export default function ClientServiceDashboard() {
  const router = useRouter();
  const { id, key } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [ws, setWs] = useState(null);
  const [members, setMembers] = useState([]);
  const [member, setMember] = useState(null);
  const [taskMember, setTaskMember] = useState(null); // filter task list by assignee
  const [openTask, setOpenTask] = useState(null);
  const [comps, setComps] = useState([]);
  const [newComp, setNewComp] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [uid, setUid] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [trendWin, setTrendWin] = useState("monthly");
  const [trendMetric, setTrendMetric] = useState("traffic");
  const [trendSeries, setTrendSeries] = useState([]);
  const [trendBusy, setTrendBusy] = useState(false);
  const [trendErr, setTrendErr] = useState("");
  const [gscProp, setGscProp] = useState(null);
  const [gscSites, setGscSites] = useState([]);
  const [gscTotals, setGscTotals] = useState(null);
  const [gscSeries, setGscSeries] = useState(null);
  const [gscReason, setGscReason] = useState("");
  const [gscPickSel, setGscPickSel] = useState("");
  const [gscBusy, setGscBusy] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [gscSitesErr, setGscSitesErr] = useState("");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docBusy, setDocBusy] = useState(false);
  const [docErr, setDocErr] = useState("");
  const [newTask, setNewTask] = useState("");
  const [ahrefs, setAhrefs] = useState(null);
  const [kw, setKw] = useState(null);
  const [topPages, setTopPages] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [compareBusy, setCompareBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [agencyPeople, setAgencyPeople] = useState([]);
  const [clientPeople, setClientPeople] = useState([]);
  const [taskTab, setTaskTab] = useState("all");
  const [qYear, setQYear] = useState(new Date().getFullYear());
  const [qQuarter, setQQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const svc = DEPARTMENTS.flatMap((d) => d.services).find((s) => s.key === key);
  const isSeo = key === "seo";

  async function loadComps() {
    const { data } = await supabase.from("competitors").select("id,name").eq("workspace_id", id).eq("service_key", key).order("created_at");
    setComps(data || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", uid).single();
      if (!prof) { router.replace("/login"); return; }
      const client = prof.side === "client";
      setIsClient(client);
      setProfile(prof);
      if (!client) setDepts(await loadAgencyDepts(uid, !!prof?.is_super_admin));
      // read the client record directly (RLS grants super admin, project lead, or assigned member)
      const { data: w } = await supabase.from("workspaces").select("id,name,industry,website,start_date,project_lead_id").eq("id", id).single();
      if (!w) { router.replace("/dashboard"); return; }
      setWs(w);
      if (w.website) {
        const enc = encodeURIComponent(w.website);
        const H = { Authorization: `Bearer ${session.access_token}` };
        fetch(`/api/ahrefs?target=${enc}`, { headers: H }).then((r) => r.json()).then((j) => setAhrefs(j)).catch(() => {});
        fetch(`/api/ahrefs?kind=keywords&target=${enc}`, { headers: H }).then((r) => r.json()).then((j) => setKw(j)).catch(() => {});
        fetch(`/api/ahrefs?kind=pages&target=${enc}`, { headers: H }).then((r) => r.json()).then((j) => setTopPages(j)).catch(() => {});
      }
      setCanEdit(!client); // clients cannot edit; agency members can (RLS enforces)
      const { data: asg } = await supabase.from("service_assignments").select("profile_id").eq("workspace_id", id).eq("service_key", key);
      const ids = [...new Set((asg || []).map((a) => a.profile_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
      setMembers(profs || []);
      setUid(uid);
      await loadComps();
      await loadTasks();
      await loadDocs();
      setLoading(false);
    })();
  }, [router, id, key]);

  async function addComp(e) {
    e.preventDefault();
    const name = newComp.trim(); if (!name) return;
    const { error } = await supabase.from("competitors").insert({ workspace_id: id, service_key: key, name });
    if (!error) { setNewComp(""); loadComps(); }
  }
  async function removeComp(cid) {
    await supabase.from("competitors").delete().eq("id", cid);
    loadComps();
  }

  function monthlyFromDaily(daily) {
    const m = {};
    (daily || []).forEach((x) => { const dt = new Date(x.date); const k = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); if (!m[k]) m[k] = { label: k + "-01", clicks: 0 }; m[k].clicks += x.clicks || 0; });
    return Object.values(m).sort((a, b) => (a.label < b.label ? -1 : 1));
  }
  function monthlyToQuarters(monthly, valKey) {
    const m = {};
    (monthly || []).forEach((x) => { const dt = new Date(x.label); const k = dt.getFullYear() + "-Q" + (Math.floor(dt.getMonth() / 3) + 1); if (!m[k]) m[k] = { label: k, value: 0 }; m[k].value += Number(x[valKey]) || 0; });
    return Object.values(m).sort((a, b) => (a.label < b.label ? -1 : 1));
  }
  async function loadTrend() {
    if (!ws?.website) { setTrendSeries([]); return; }
    setTrendBusy(true); setTrendErr("");
    const d = new Date(); d.setMonth(d.getMonth() - 25);
    const date_from = d.toISOString().slice(0, 10);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const H = { Authorization: `Bearer ${sess.session?.access_token}` };
      const r = await fetch(`/api/ahrefs?kind=history&grouping=monthly&date_from=${date_from}&target=${encodeURIComponent(ws.website)}`, { headers: H });
      const j = await r.json(); setTrendBusy(false);
      if (!j.ok) { setTrendErr("Trend source said: " + String(j.message || j.error || "no response").slice(0, 140)); setTrendSeries([]); return; }
      const pts = (j.series || []).map((x) => ({ label: x.date, traffic: x.org_traffic })).sort((a, b) => (a.label < b.label ? -1 : 1));
      setTrendSeries(pts);
    } catch (e) { setTrendBusy(false); setTrendErr("Couldn't load the trend."); setTrendSeries([]); }
  }
  function trendChart(win, monthly, valKey) {
    const fmt = (l) => { if (String(l).includes("Q")) return l; const dt = new Date(l); return isNaN(dt) ? l : dt.toLocaleString("en", { month: "short" }) + " " + String(dt.getFullYear()).slice(2); };
    let full, bars, base, periodWord, labelAt;
    if (win === "quarterly") {
      full = monthlyToQuarters(monthly, valKey);
      bars = full.slice(-8); base = full.length - bars.length; periodWord = "quarter";
      labelAt = (fi) => full[fi].label;
      var valueAt = (fi) => full[fi] ? full[fi].value : 0;
      var compareAt = (fi) => { const prev = full[fi - 1]; return prev && prev.value > 0 ? Math.round(((full[fi].value - prev.value) / prev.value) * 100) : null; };
    } else {
      full = monthly.map((x) => ({ label: x.label, value: Number(x[valKey]) || 0 }));
      const showN = win === "6m" ? 6 : 12;
      bars = full.slice(-showN); base = full.length - bars.length;
      labelAt = (fi) => full[fi].label;
      var valueAt = (fi) => full[fi] ? full[fi].value : 0;
      if (win === "1y") { periodWord = "year"; var compareAt = (fi) => { const prev = full[fi - 12]; return prev && prev.value > 0 ? Math.round(((full[fi].value - prev.value) / prev.value) * 100) : null; }; }
      else { periodWord = "month"; var compareAt = (fi) => { const prev = full[fi - 1]; return prev && prev.value > 0 ? Math.round(((full[fi].value - prev.value) / prev.value) * 100) : null; }; }
    }
    const barVals = bars.map((_, i) => valueAt(base + i));
    const max = Math.max(...barVals, 1);
    const hovering = hoverIdx != null && hoverIdx >= 0 && hoverIdx < bars.length;
    const idx = hovering ? hoverIdx : bars.length - 1;
    let headVal, headPct, headWord, headLabel;
    if (win === "6m" && !hovering) {
      const last6 = full.slice(-6).reduce((a, b) => a + b.value, 0);
      const prev6 = full.slice(-12, -6).reduce((a, b) => a + b.value, 0);
      headVal = last6; headWord = "6 months"; headLabel = "last 6 months"; headPct = prev6 > 0 ? Math.round(((last6 - prev6) / prev6) * 100) : null;
    } else {
      const fi = base + idx; headVal = valueAt(fi); headPct = compareAt(fi); headWord = periodWord; headLabel = fmt(labelAt(fi));
    }
    return (
      <>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 700 }}>{headVal.toLocaleString()}</span>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>{headLabel}</span>
          {headPct != null && <span style={{ fontSize: 13, color: headPct >= 0 ? "#177E4E" : "var(--danger)" }}>{headPct >= 0 ? "\u25B2" : "\u25BC"} {Math.abs(headPct)}% vs previous {headWord}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
          {bars.map((b, i) => { const v = barVals[i]; const h = Math.max(4, Math.round((v / max) * 110)); const active = i === idx; return (
            <div key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }} title={v.toLocaleString()}>
              <div style={{ width: "100%", height: h, background: active ? "#2557C7" : "var(--line)", borderRadius: "6px 6px 0 0", transition: "background .12s" }} />
              <span style={{ fontSize: 10, color: active ? "var(--text)" : "var(--faint)", whiteSpace: "nowrap" }}>{fmt(labelAt(base + i))}</span>
            </div>
          ); })}
        </div>
      </>
    );
  }
  async function loadGsc() {
    const { data: sess } = await supabase.auth.getSession();
    const H = { Authorization: `Bearer ${sess.session?.access_token}` };
    const r = await fetch(`/api/gsc/data?workspaceId=${id}&series=1&days=490`, { headers: H });
    const j = await r.json();
    if (j.ok) { setGscTotals(j.totals); setGscSeries(j.series || []); setGscProp(j.property); setGscReason(""); return; }
    setGscTotals(null); setGscSeries(null); setGscProp(null); setGscReason(j.reason || "no_data");
    if (j.reason === "no_property" && !isClient) {
      const pr = await fetch(`/api/gsc/properties`, { headers: H });
      const pj = await pr.json(); setGscSites(pj.sites || []); setGscSitesErr(pj.error || "");
    }
  }
  async function saveProperty() {
    if (!gscPickSel) return;
    setGscBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    await fetch(`/api/gsc/property`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ workspaceId: id, property: gscPickSel }) });
    setGscBusy(false); loadGsc();
  }
  async function loadDocs() {
    const { data } = await supabase.from("service_documents").select("*").eq("workspace_id", id).eq("service_key", key).order("created_at", { ascending: false });
    setDocs(data || []);
  }
  async function addDoc() {
    const name = docName.trim(); let url = docUrl.trim();
    if (!name || !url) { setDocErr("Add a name and a link."); return; }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setDocBusy(true); setDocErr("");
    const { error } = await supabase.from("service_documents").insert({ workspace_id: id, service_key: key, name, url, created_by: uid, created_by_name: profile?.full_name || profile?.email || null });
    setDocBusy(false);
    if (error) { setDocErr(error.message || "Could not add."); return; }
    setDocName(""); setDocUrl(""); loadDocs();
  }
  async function removeDoc(docId) {
    await supabase.from("service_documents").delete().eq("id", docId);
    loadDocs();
  }
  useEffect(() => { if (ws?.website) loadTrend(); /* eslint-disable-next-line */ }, [ws?.website]);
  useEffect(() => { if (uid) loadGsc(); /* eslint-disable-next-line */ }, [uid]);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("id,title,status,assignee_id,client_note,created_at,due_date,priority,frequency,description,deliverable_link,updated_at").eq("workspace_id", id).in("service_key", [key, "general"]).order("created_at", { ascending: true });
    setTasks(data || []);
  }
  async function addTask(e) {
    e.preventDefault(); const title = newTask.trim(); if (!title) return;
    const { error } = await supabase.from("tasks").insert({ workspace_id: id, service_key: key, title, status: "todo", assignee_id: uid, created_by: uid });
    if (!error) { setNewTask(""); loadTasks(); }
  }
  async function setStatus(taskId, status) {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", taskId);
    loadTasks();
  }
  async function delTask(taskId) {
    await supabase.from("tasks").delete().eq("id", taskId);
    loadTasks();
  }

  async function openCompare() {
    setShowCompare(true); setCompareBusy(true); setCompareData(null);
    const { data: sess } = await supabase.auth.getSession();
    const H = { Authorization: `Bearer ${sess.session?.access_token}` };
    const targets = [{ name: (ws?.name || "You") + " (you)", domain: ws?.website, you: true }, ...comps.map((c) => ({ name: c.name, domain: c.name }))];
    const rows = await Promise.all(targets.map(async (t) => {
      if (!t.domain) return { ...t, org_traffic: null, org_keywords: null, backlinks: null };
      try { const r = await fetch(`/api/ahrefs?target=${encodeURIComponent(t.domain)}`, { headers: H }); const j = await r.json(); return { ...t, org_traffic: j.org_traffic, org_keywords: j.org_keywords, backlinks: j.backlinks, ok: j.ok }; }
      catch { return { ...t, org_traffic: null }; }
    }));
    setCompareData(rows); setCompareBusy(false);
  }

  if (loading) return <div className="center">Loading…</div>;

  const clientNav = (<><div className="grp">Menu</div><nav className="nav"><a onClick={() => router.push("/dashboard")} style={{ cursor: "pointer" }}>← Back to dashboard</a></nav></>);
  return (
    <Shell profile={profile} roleLabel={isClient ? "Client" : (profile?.is_super_admin ? "Super admin" : "Team member")} nav={isClient ? clientNav : <AgencyNav profile={profile} active={"svc:" + key} depts={depts} />}>
      <a style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }} onClick={() => router.push(isClient ? "/dashboard" : `/client/${id}`)}>← {isClient ? "Back to dashboard" : (ws?.name || "Client")}</a>
      <div className="page-head" style={{ marginTop: 8 }}>
        <h1 style={{ fontSize: 24, display: "flex", alignItems: "center", gap: 10 }}>{ws?.name} <span className="pill" style={{ background: "#E7F0FF", color: "#2557C7" }}>{svc?.label || key}</span></h1>
        {!isClient && <span className="pill p-agency">Oversight</span>}
      </div>
      {!isClient && <AskVelvet focusWorkspaceId={id} serviceKey={key} suggestions={[`How is ${ws?.name || "this client"} doing vs competitors?`, `What should we prioritise for ${ws?.name || "this client"}?`]} />}

      {!isClient && (
      <div className="card">
        <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 8 }}>{svc?.label} team on this client — filter the tasks below by member</div>
        {members.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No one assigned to this service yet.</div>
          : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="pill" style={{ border: "0.5px solid var(--line)", cursor: "pointer", background: !taskMember ? "#0B0D12" : "var(--paper)", color: !taskMember ? "#fff" : "var(--text)" }} onClick={() => setTaskMember(null)}>All ({tasks.length})</button>
              {members.map((m) => {
                const n = tasks.filter((t) => t.assignee_id === m.id).length;
                const on = taskMember === m.id;
                return (
                  <button key={m.id} className="pill" style={{ border: "0.5px solid var(--line)", cursor: "pointer", background: on ? "var(--gold,#F7C948)" : "var(--paper)", color: on ? "#0B0D12" : "var(--text)", fontWeight: on ? 600 : 400 }} onClick={() => setTaskMember(on ? null : m.id)}>{(m.full_name || m.email)} ({n})</button>
                );
              })}
            </div>}
      </div>
      )}

      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>{isSeo ? "Search performance" : (svc?.label + " performance")} <span className="pill p-agency" style={{ marginLeft: 4 }}>{gscTotals ? "live · GSC" : "connect GSC"}</span></div>
      {gscTotals ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          {[["Clicks", (gscTotals.clicks || 0).toLocaleString()], ["Impressions", (gscTotals.impressions || 0).toLocaleString()], ["Avg position", gscTotals.position ? gscTotals.position.toFixed(1) : "—"], ["CTR", gscTotals.ctr ? (gscTotals.ctr * 100).toFixed(1) + "%" : "—"]].map(([k, v]) => (
            <div className="card" key={k} style={{ margin: 0 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div></div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 14 }}>
          {isClient ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Search performance appears once your team connects this data source.</div>
            : gscReason === "not_connected" ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Connect the agency Google account first in Settings → Data connections.</div>
            : gscReason === "no_property" ? (
              <>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Match this client to its Google Search Console property:</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="input" style={{ flex: 1 }} value={gscPickSel} onChange={(e) => setGscPickSel(e.target.value)}>
                    <option value="">Choose a property…</option>
                    {gscSites.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={saveProperty} disabled={gscBusy || !gscPickSel}>{gscBusy ? "Saving…" : "Save"}</button>
                </div>
                {gscSitesErr && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{gscSitesErr}</div>}
              </>
            ) : <div style={{ fontSize: 13, color: "var(--muted)" }}>No Search Console data yet for this client.</div>}
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <b>Traffic overview</b>
          <span className="pill p-agency">{ahrefs?.ok ? "live · Ahrefs" : "no data"}</span>
        </div>
        {(() => {
          const fmt = (n) => (n == null ? "—" : n >= 1000000 ? (n / 1000000).toFixed(1) + "m" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
          if (!ahrefs) return <div style={{ fontSize: 13, color: "var(--faint)" }}>Loading Ahrefs…</div>;
          if (!ahrefs.ok) return <div style={{ fontSize: 13, color: "var(--faint)" }}>{ahrefs.error === "no_target" ? "Add this client's website in their details to pull live Ahrefs data." : ahrefs.error === "no_key" ? "Ahrefs API key is missing." : "Couldn't reach Ahrefs right now."}</div>;
          const cells = [["Organic traffic", fmt(ahrefs.org_traffic)], ["Organic keywords", fmt(ahrefs.org_keywords)], ["Domain Rating (DR)", ahrefs.domain_rating != null ? Math.round(ahrefs.domain_rating) : "—"], ["Total backlinks", fmt(ahrefs.backlinks)]];
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {cells.map(([k, v]) => (<div key={k} style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{v}</div></div>))}
            </div>
          );
        })()}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b>Trends</b>
          <span style={{ display: "flex", gap: 6 }}>
            {[["traffic", "Traffic"], ["clicks", "Clicks"]].map(([k, l]) => (
              <span key={k} onClick={() => setTrendMetric(k)} style={{ fontSize: 12, cursor: "pointer", padding: "3px 10px", borderRadius: 20, background: trendMetric === k ? "#0B0D12" : "var(--paper)", color: trendMetric === k ? "#fff" : "var(--text)", border: "0.5px solid var(--line)" }}>{l}</span>
            ))}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {[["monthly", "Monthly"], ["quarterly", "Quarterly"], ["6m", "6 months"], ["1y", "1 year"]].map(([k, l]) => (
            <span key={k} onClick={() => setTrendWin(k)} style={{ fontSize: 13, cursor: "pointer", padding: "5px 12px", borderRadius: 20, background: trendWin === k ? "#2557C7" : "var(--paper)", color: trendWin === k ? "#fff" : "var(--muted)", border: "0.5px solid var(--line)" }}>{l}</span>
          ))}
        </div>
        {trendMetric === "clicks"
          ? (!gscProp
              ? <div style={{ fontSize: 13, color: "var(--faint)" }}>{isClient ? "Clicks appear once your team connects this data." : "Match this client to a Search Console property in the Search performance section above to see clicks."}</div>
              : (() => { const monthly = monthlyFromDaily(gscSeries || []); return monthly.length ? trendChart(trendWin, monthly, "clicks") : <div style={{ fontSize: 13, color: "var(--faint)" }}>No Search Console clicks for this range yet.</div>; })())
          : !ws?.website ? <div style={{ fontSize: 13, color: "var(--faint)" }}>Add this client's website to see trends.</div>
          : trendBusy ? <div style={{ fontSize: 13, color: "var(--faint)" }}>Loading trend…</div>
          : trendErr ? <div style={{ fontSize: 13, color: "var(--faint)" }}>{trendErr}</div>
          : trendSeries.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No trend data for this range yet.</div>
          : trendChart(trendWin, trendSeries, "traffic")}
      </div>

      {isSeo && (() => {
        const fmt = (n) => (n == null ? "—" : n >= 1000000 ? (n / 1000000).toFixed(1) + "m" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
        const kwLive = kw?.ok, pgLive = topPages?.ok;
        const kwRows = kwLive ? kw.keywords.map((k) => [k.keyword, fmt(k.traffic)]) : [];
        const pgRows = pgLive ? topPages.pages.map((x) => { let u = x.url || ""; try { u = new URL(x.url).pathname || x.url; } catch {} return [u, fmt(x.traffic)]; }) : [];
        return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div className="card" style={{ margin: 0 }}><b style={{ fontSize: 13 }}>Top 5 queries</b><span className="pill p-agency" style={{ marginLeft: 6 }}>{kwLive ? "live · Ahrefs" : "no data"}</span>
            <div style={{ marginTop: 8, fontSize: 12 }}>{kwRows.length === 0 ? <div style={{ color: "var(--faint)" }}>No keyword data.</div> : kwRows.map(([q, n], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "0.5px solid var(--line)" }}><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span><span style={{ color: "var(--faint)", flex: "none", marginLeft: 8 }}>{n}</span></div>))}</div></div>
          <div className="card" style={{ margin: 0 }}><b style={{ fontSize: 13 }}>Top 5 pages</b><span className="pill p-agency" style={{ marginLeft: 6 }}>{pgLive ? "live · Ahrefs" : "no data"}</span>
            <div style={{ marginTop: 8, fontSize: 12 }}>{pgRows.length === 0 ? <div style={{ color: "var(--faint)" }}>No page data.</div> : pgRows.map(([q, n], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "0.5px solid var(--line)" }}><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span><span style={{ color: "var(--faint)", flex: "none", marginLeft: 8 }}>{n}</span></div>))}</div></div>
        </div>);
      })()}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><b>Competitors</b></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
          {comps.length === 0 && <span style={{ fontSize: 12, color: "var(--faint)" }}>No competitors added yet.</span>}
          {comps.map((c) => (
            <span key={c.id} className="pill" style={{ border: "0.5px solid var(--line)", display: "flex", alignItems: "center", gap: 6 }}>{c.name}
              <span style={{ cursor: "pointer", color: "var(--faint)" }} onClick={() => removeComp(c.id)}>✕</span></span>
          ))}
        </div>
        <form onSubmit={addComp} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input className="input" style={{ flex: 1 }} value={newComp} onChange={(e) => setNewComp(e.target.value)} placeholder="Add a competitor domain (e.g. sportpesa.com)" />
          <button className="btn btn-ghost">Add</button>
        </form>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={openCompare} disabled={comps.length === 0}>Compare organic traffic, keywords &amp; backlinks</button>
      </div>


      <div className="card" style={{ marginTop: 12 }}>
        <b>{svc?.label} tasks for {ws?.name}</b>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 10px" }}>The team's action plan for this client. Move items To do → In progress → Delivered.</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {!isClient && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add task</button>}
          <button className="btn btn-primary" onClick={() => setShowAssign(true)}>Assign task</button>
        </div>

        <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 10, flexWrap: "wrap" }}>
          {[["all","All"],["today","Today"],["this_week","This week"],["this_month","This month"],["this_quarter","This quarter"]].map(([v,l]) => (
            <button key={v} onClick={() => setTaskTab(v)} className="btn" style={{ padding: "6px 12px", fontSize: 13, background: taskTab === v ? "#fff" : "transparent", boxShadow: taskTab === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: taskTab === v ? "var(--text)" : "var(--muted)" }}>{l}</button>
          ))}
        </div>

        {taskTab === "this_quarter" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <select className="input" style={{ width: "auto" }} value={qYear} onChange={(e) => setQYear(Number(e.target.value))}>
              {Array.from({ length: 2040 - new Date().getFullYear() + 1 }, (_, i) => new Date().getFullYear() + i).map((yy) => <option key={yy} value={yy}>{yy}</option>)}
            </select>
            {[1,2,3,4].map((q) => (
              <button key={q} onClick={() => setQQuarter(q)} className="btn" style={{ padding: "6px 12px", fontSize: 13, background: qQuarter === q ? "#0B0D12" : "transparent", color: qQuarter === q ? "#fff" : "var(--muted)", border: "0.5px solid var(--line)" }}>Q{q}</button>
            ))}
          </div>
        )}

        {(() => {
          const b = tabBounds(taskTab, qYear, qQuarter);
          let list = b ? tasks.filter((t) => t.due_date && t.due_date >= b[0] && t.due_date <= b[1]) : tasks;
          if (taskMember) list = list.filter((t) => t.assignee_id === taskMember);
          if (list.length === 0) return <div style={{ fontSize: 13, color: "var(--faint)" }}>{b ? "No tasks with a due date in this period." : "No tasks yet."}</div>;
          return list.map((t) => {
            const st = STATUS[t.status] || STATUS.todo;
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{t.due_date ? "due " + t.due_date : "no due date"}{t.status === "delivered" ? " · submitted " + new Date(t.updated_at || t.created_at).toLocaleDateString() : ""}</div>
                  {t.status === "needs_look" && t.client_note && <div style={{ fontSize: 11, color: "#B4640C", marginTop: 2 }}>Client: {t.client_note}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                  <span className="pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setOpenTask(t)}>Open</button>
                  <select className="input" style={{ padding: "4px 8px", width: "auto" }} value={["todo","in_progress","delivered"].includes(t.status) ? t.status : ""} onChange={(e) => setStatus(t.id, e.target.value)}>
                    {!["todo","in_progress","delivered"].includes(t.status) && <option value="">move…</option>}
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <span style={{ cursor: "pointer", color: "var(--faint)" }} onClick={() => delTask(t.id)}>✕</span>
                </div>
              </div>
            );
          });
        })()}
      </div>



      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Documents</b>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>{svc?.label} · {isClient ? "shared with you" : "only this client sees these"}</span>
        </div>
        {docs.length === 0
          ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No documents yet.{isClient ? "" : " Add your audit, slides, or QBR deck below."}</div>
          : <div style={{ marginTop: 10, border: "0.5px solid var(--line)", borderRadius: 8 }}>
              {docs.map((d, i) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: i ? "0.5px solid var(--line)" : "none", fontSize: 14 }}>
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ color: "var(--text)", textDecoration: "none", flex: 1 }}>{d.name}</a>
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2557C7" }}>Open ↗</a>
                  {!isClient && <span onClick={() => removeDoc(d.id)} style={{ fontSize: 12, color: "var(--danger)", cursor: "pointer" }}>Remove</span>}
                </div>
              ))}
            </div>}
        {!isClient && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 8, alignItems: "center" }}>
            <input className="input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Document name" />
            <input className="input" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Paste Google Drive link…" />
            <button className="btn btn-primary" onClick={addDoc} disabled={docBusy}>{docBusy ? "Adding…" : "Add"}</button>
          </div>
        )}
        {!isClient && docErr && <div className="auth-msg auth-err" style={{ marginTop: 8 }}>{docErr}</div>}
        {!isClient && <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>Make sure the Drive file is shared so anyone with the link can view, or the client will hit a sign-in wall.</div>}
      </div>


      {openTask && <TaskDetail task={openTask} onClose={() => setOpenTask(null)} />}
      {showAdd && <AddTask me={uid} fixedClient={{ id, name: ws?.name }} defaultServiceKey={key} onClose={() => setShowAdd(false)} onCreated={loadTasks} />}
      {showAssign && <AssignTask me={uid} client={{ id, name: ws?.name }} serviceKey={key} agencyPeople={agencyPeople} clientPeople={clientPeople} onClose={() => setShowAssign(false)} onCreated={loadTasks} />}

      {showCompare && (
        <Modal title="You vs competitors" onClose={() => setShowCompare(false)}>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: -6, marginBottom: 12 }}>Organic traffic, top-10 keywords, backlinks · current</div>
          {compareBusy && <div style={{ fontSize: 13, color: "var(--faint)", padding: "10px 0" }}>Loading…</div>}
          {!compareBusy && (() => {
            const fmt = (n) => (n == null ? "—" : n >= 1000000 ? (n / 1000000).toFixed(1) + "m" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
            const rows = compareData || [];
            const PAL = [{ bar: "#AFC8F0", bg: "#EAF0FF", fg: "#2557C7" }, { bar: "#B9E0A8", bg: "#E7F6EF", fg: "#177E4E" }, { bar: "#F2B4A3", bg: "#FBEAE6", fg: "#C0392B" }, { bar: "#D9C6F2", bg: "#F0E9FB", fg: "#7C3AED" }];
            const styleFor = (r, i) => r.you ? { bar: "var(--gold,#F7C948)", bg: "#FCEFC3", fg: "#7A5B00" } : PAL[i % PAL.length];
            const badge = (r, i) => { const st = styleFor(r, i); return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: st.bg, color: st.fg, fontSize: 11, fontWeight: 700, marginRight: 8 }}>{(r.name || "?").trim().charAt(0).toUpperCase()}</span>; };
            const maxT = Math.max(1, ...rows.map((r) => r.org_traffic || 0));
            return (<>
              {/* table */}
              <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr 1fr", gap: 6, fontSize: 12, color: "var(--faint)", padding: "0 6px 6px", borderBottom: "0.5px solid var(--line)" }}>
                <span></span><span style={{ textAlign: "right" }}>Organic traffic</span><span style={{ textAlign: "right" }}>Top-10 kws</span><span style={{ textAlign: "right" }}>Backlinks</span>
              </div>
              {rows.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr 1fr", gap: 6, alignItems: "center", padding: "10px 6px", borderBottom: "0.5px solid var(--line)", fontSize: 13, background: r.you ? "#FCF7E6" : "transparent", borderRadius: r.you ? 6 : 0 }}>
                  <span style={{ display: "flex", alignItems: "center", fontWeight: r.you ? 600 : 400, minWidth: 0 }}>{badge(r, i)}<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span></span>
                  <span style={{ textAlign: "right", fontWeight: r.you ? 600 : 400 }}>{fmt(r.org_traffic)}</span>
                  <span style={{ textAlign: "right", fontWeight: r.you ? 600 : 400 }}>{fmt(r.org_keywords)}</span>
                  <span style={{ textAlign: "right", fontWeight: r.you ? 600 : 400 }}>{fmt(r.backlinks)}</span>
                </div>
              ))}
              {/* organic-traffic bars */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--seo,#2557C7)", margin: "16px 0 8px" }}>Organic traffic</div>
              {rows.map((r, i) => { const st = styleFor(r, i); const pct = r.org_traffic ? Math.max(3, Math.round((r.org_traffic / maxT) * 100)) : 0; return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 48px", gap: 8, alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(r.name || "").replace(" (you)", "")}</span>
                  <div style={{ background: "#EEF1F4", borderRadius: 6, height: 15, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 6, background: st.bar }} /></div>
                  <span style={{ fontSize: 12, textAlign: "right", color: "var(--faint)" }}>{fmt(r.org_traffic)}</span>
                </div>
              ); })}
              {(compareData || []).some((r) => !r.you && r.org_traffic == null) && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>A "—" means that competitor was added as a name, not a domain. Edit it to a domain for live data.</div>}
            </>);
          })()}
        </Modal>
      )}
    </Shell>
  );
}
