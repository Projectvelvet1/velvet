"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import ClientView from "../../components/ClientView";
import Modal from "../../components/Modal";
import { departmentsForRole, DEPARTMENTS } from "../../lib/agencyNav";
import AgencyNav from "../../components/AgencyNav";
import AddTask from "../../components/AddTask";

const HEALTH = { healthy: { label: "Healthy", bg: "#E4F6EC", fg: "#177E4E" }, watch: { label: "To watch", bg: "#FDEBD3", fg: "#B4640C" }, risk: { label: "At risk", bg: "#FBEAE6", fg: "#C0392B" } };
const DEPT_COLOR = { Performance: "#C0392B", Content: "#7C3AED", Analytics: "#1E7F5C" };
const SVC_DEPT = { paid_media:"Performance", seo:"Performance", aso:"Performance", creative_strategy:"Content", asset_production:"Content", ugc:"Content", tracking:"Analytics", dashboarding:"Analytics" };
const DEPT_ORDER = ["Performance","Content","Analytics"];
const TSTATUS = { todo:{l:"To do",bg:"#EEF0FF",fg:"#3B49C7"}, in_progress:{l:"In progress",bg:"#FFF3D6",fg:"#9A6B00"}, delivered:{l:"Delivered",bg:"#E7F0FF",fg:"#2557C7"}, reviewed:{l:"Reviewed",bg:"#E4F6EC",fg:"#177E4E"}, needs_look:{l:"Needs another look",bg:"#FDEBD3",fg:"#B4640C"} };
const SVC_LABEL = {}; DEPARTMENTS.forEach((d) => d.services.forEach((x) => { SVC_LABEL[x.key] = x.label; }));
const PRIO_W = { urgent: 3, high: 2, medium: 1, low: 0 };
const PRIO_META = { urgent: { l: "Urgent", bg: "#FBEAE6", fg: "#C0392B" }, high: { l: "High", bg: "#FDEBD3", fg: "#B4640C" }, medium: { l: "Medium", bg: "#EEF0FF", fg: "#3B49C7" }, low: { l: "Low", bg: "#EEF1F4", fg: "#5B6472" } };
function ymd(d) { return d.toISOString().slice(0, 10); }
function rangeBounds(tab) {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  if (tab === "today") { const t = ymd(now); return [t, t]; }
  if (tab === "this_week") { const day = (now.getDay() + 6) % 7; const mon = new Date(now); mon.setDate(now.getDate() - day); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return [ymd(mon), ymd(sun)]; }
  if (tab === "this_month") { return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))]; }
  const q = Math.floor(m / 3); return [ymd(new Date(y, q * 3, 1)), ymd(new Date(y, q * 3 + 3, 0))];
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clientWorkspace, setClientWorkspace] = useState(null);
  const [clientServices, setClientServices] = useState([]);
  const [richClients, setRichClients] = useState([]);
  const [depts, setDepts] = useState([]);
  const [seesAll, setSeesAll] = useState(false);
  const [editMeta, setEditMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [metaErr, setMetaErr] = useState("");
  const [myMode, setMyMode] = useState(false);
  const [myTasks, setMyTasks] = useState([]);
  const [myClients, setMyClients] = useState([]);
  const [myCounts, setMyCounts] = useState({ in_progress: 0, delivered: 0, needs_look: 0, done: 0 });
  const [myServiceLine, setMyServiceLine] = useState("");
  const [myTab, setMyTab] = useState("this_week");
  const [showAdd, setShowAdd] = useState(false);
  const [cardFilter, setCardFilter] = useState(null);
  const [askInput, setAskInput] = useState("");
  const [askThread, setAskThread] = useState([]);
  const [askContext, setAskContext] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askErr, setAskErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", uid).single();
      const p = prof || { id: uid, email: session.user.email, side: "agency" };
      setProfile(p);

      if (p.side === "client") {
        const { data: ws } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,discovery_complete").limit(1);
        const w = ws?.[0] || null; setClientWorkspace(w);
        if (w && w.phase !== "prospect") {
          const { data: svc } = await supabase.from("client_services").select("department,service_label,service_key").eq("workspace_id", w.id);
          setClientServices(svc || []);
        }
        setLoading(false); return;
      }

      // agency: read everything client-side (super admin RLS sees all; project lead sees their own)
      const { data: ws } = await supabase.from("workspaces")
        .select("id,name,is_demo,phase,onboarding_complete,project_lead_id,industry,website,start_date,lead_name,health,upsell,notes")
        .order("created_at", { ascending: true });
      const all = ws || [];
      const isProjectLead = all.some((w) => w.project_lead_id === uid);
      const all3 = !!p.is_super_admin || isProjectLead;
      setSeesAll(all3);
      const { data: assignsMine } = await supabase.from("service_assignments").select("service_key,workspace_id").eq("profile_id", uid);
      setDepts(departmentsForRole({ seesAll: all3, assignedServiceKeys: new Set((assignsMine || []).map((a) => a.service_key)) }));

      const teamMemberOnly = !p.is_super_admin && !isProjectLead;
      if (teamMemberOnly) {
        setMyMode(true);
        const nameOf = (wid) => (all.find((w) => w.id === wid)?.name) || "Client";
        // their clients (distinct), each opens their assigned service dashboard
        const seen = {}; const myCl = [];
        (assignsMine || []).forEach((a) => { if (!seen[a.workspace_id]) { seen[a.workspace_id] = a.service_key; myCl.push({ id: a.workspace_id, name: nameOf(a.workspace_id), serviceKey: a.service_key }); } });
        setMyClients(myCl);
        const svcKeys = [...new Set((assignsMine || []).map((a) => a.service_key))];
        setMyServiceLine(svcKeys.map((k) => SVC_LABEL[k] || k).join(", "));
        // their tasks across all clients
        const { data: mine } = await supabase.from("tasks").select("id,title,status,workspace_id,service_key,updated_at,due_date,priority").eq("assignee_id", uid).order("updated_at", { ascending: false });
        const rows = (mine || []).map((t) => ({ ...t, client: nameOf(t.workspace_id) }));
        setMyTasks(rows);
        const now = new Date(); const mKey = now.getFullYear() + "-" + now.getMonth();
        setMyCounts({
          in_progress: rows.filter((t) => t.status === "in_progress").length,
          delivered: rows.filter((t) => t.status === "delivered").length,
          needs_look: rows.filter((t) => t.status === "needs_look").length,
          done: rows.filter((t) => t.status === "reviewed" && new Date(t.updated_at).getFullYear() + "-" + new Date(t.updated_at).getMonth() === mKey).length,
        });
        setLoading(false); return;
      }

      // active = signed + onboarding complete; project lead limited to their own
      let active = all.filter((w) => w.phase === "signed" && w.onboarding_complete);
      if (!p.is_super_admin) active = active.filter((w) => w.project_lead_id === uid);

      if (active.length) {
        const ids = active.map((w) => w.id);
        const [{ data: svcs }, { data: asg }, { data: subs }] = await Promise.all([
          supabase.from("client_services").select("workspace_id,service_key,service_label").in("workspace_id", ids),
          supabase.from("service_assignments").select("workspace_id,service_key,profile_id").in("workspace_id", ids),
          supabase.from("feedback_submissions").select("workspace_id,overall_score,created_at").in("workspace_id", ids).order("created_at", { ascending: false }),
        ]);
        const leadIds = active.map((w) => w.project_lead_id).filter(Boolean);
        const profIds = [...new Set([...(asg || []).map((a) => a.profile_id), ...leadIds])];
        const { data: profs } = profIds.length ? await supabase.from("profiles").select("id,full_name,email").in("id", profIds) : { data: [] };
        const nameOf = (id) => { const pr = (profs || []).find((x) => x.id === id); return pr ? (pr.full_name || pr.email) : "Unknown"; };

        const built = active.map((w) => {
          const services = (svcs || []).filter((s) => s.workspace_id === w.id);
          const byDept = {};
          (asg || []).filter((a) => a.workspace_id === w.id).forEach((a) => {
            const dept = SVC_DEPT[a.service_key] || "Other";
            const label = services.find((s) => s.service_key === a.service_key)?.service_label || a.service_key;
            (byDept[dept] = byDept[dept] || []).push(`${nameOf(a.profile_id)} (${label})`);
          });
          const team = DEPT_ORDER.filter((d) => byDept[d]).map((d) => ({ dept: d, members: [...new Set(byDept[d])] }));
          const fb = (subs || []).find((s) => s.workspace_id === w.id) || null;
          return {
            id: w.id, name: w.name, is_demo: w.is_demo, industry: w.industry, website: w.website, start_date: w.start_date,
            lead_name: w.lead_name || (w.project_lead_id ? nameOf(w.project_lead_id) : null),
            health: w.health || "healthy", upsell: w.upsell || "", notes: w.notes || "",
            services: services.map((s) => s.service_label),
            team, feedback: fb ? { overall: fb.overall_score, date: fb.created_at } : null,
            canEditMeta: !!p.is_super_admin || w.project_lead_id === uid,
          };
        });
        setRichClients(built);
      } else {
        setRichClients([]);
      }
      setLoading(false);
    })();
  }, [router]);

  function openMeta(c) { setMetaErr(""); setEditMeta({ id: c.id, name: c.name, health: c.health || "healthy", upsell: c.upsell || "", notes: c.notes || "" }); }
  async function saveMeta(e) {
    e.preventDefault(); setBusy(true);
    const patch = { health: editMeta.health, upsell: (editMeta.upsell || "").trim() || null, notes: (editMeta.notes || "").trim() || null };
    const { error } = await supabase.from("workspaces").update(patch).eq("id", editMeta.id);
    setBusy(false);
    if (error) { setMetaErr(error.message || "Could not save."); return; }
    setMetaErr(""); setRichClients((cs) => cs.map((c) => c.id === editMeta.id ? { ...c, health: editMeta.health, upsell: editMeta.upsell, notes: editMeta.notes } : c)); setEditMeta(null);
  }

  if (loading) return <div className="center">Loading your workspace…</div>;

  const isAgency = profile?.side === "agency";
  if (!isAgency) {
    if (!clientWorkspace) return <div className="center">Your account is being set up. Please check back shortly.</div>;
    return <ClientView workspace={clientWorkspace} services={clientServices} profile={profile} />;
  }

  const roleLabel = profile?.is_super_admin ? "Super admin" : "Team member";
  const nav = <AgencyNav profile={profile} active="dashboard" depts={depts} />;
  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0].split("@")[0];

  if (myMode) {
    const today = ymd(new Date());
    const [qa, qb] = rangeBounds("this_quarter");
    const inQ = (d) => { if (!d) return false; const x = ymd(new Date(d)); return x >= qa && x <= qb; };
    const openT = myTasks.filter((t) => ["todo", "in_progress", "needs_look"].includes(t.status));
    const cIn = myTasks.filter((t) => t.status === "in_progress").length;
    const cAwait = myTasks.filter((t) => t.status === "delivered").length;
    const cBack = myTasks.filter((t) => t.status === "needs_look").length;
    const cDone = myTasks.filter((t) => (t.status === "delivered" || t.status === "reviewed") && inQ(t.updated_at)).length;
    const [wa, wb] = rangeBounds("this_week");
    const cDueWeek = openT.filter((t) => t.due_date && t.due_date >= wa && t.due_date <= wb).length;
    const cOverdue = openT.filter((t) => t.due_date && t.due_date < today).length;
    const cUnassigned = openT.filter((t) => !t.due_date || !t.workspace_id).length;

    const [ra, rb] = rangeBounds(myTab);
    const queue = openT.filter((t) => t.due_date && t.due_date >= ra && t.due_date <= rb)
      .sort((x, y) => (PRIO_W[y.priority] || 1) - (PRIO_W[x.priority] || 1) || (x.due_date || "").localeCompare(y.due_date || ""));
    const TABS = [["today", "Today"], ["this_week", "This week"], ["this_month", "This month"], ["this_quarter", "This quarter"]];

    const svcKey = myClients[0]?.serviceKey;
    const dept = DEPARTMENTS.find((d) => d.services.some((x) => x.key === svcKey));
    const svcLine = (dept?.label && svcKey) ? `${dept.label} · ${SVC_LABEL[svcKey] || svcKey}` : (myServiceLine || "Your workspace");
    const topClient = myClients[0]?.name || "your client";

    const PILL = {
      todo: { l: "To do", bg: "#EEF0FF", fg: "#3B49C7" },
      in_progress: { l: "In progress", bg: "#FCEFC3", fg: "#7A5B00" },
      delivered: { l: "Awaiting client", bg: "#F0E9FB", fg: "#7C3AED" },
      needs_look: { l: "Needs another look", bg: "#FDEBD3", fg: "#B4640C" },
      reviewed: { l: "Reviewed", bg: "#E7F6EF", fg: "#177E4E" },
    };
    const FILTERS = {
      in_progress: { label: "In progress", fn: (t) => t.status === "in_progress" },
      awaiting: { label: "Awaiting client", fn: (t) => t.status === "delivered" },
      back: { label: "Back to me", fn: (t) => t.status === "needs_look" },
      done: { label: "Done this quarter", fn: (t) => (t.status === "delivered" || t.status === "reviewed") && inQ(t.updated_at) },
      open: { label: "Open tasks", fn: (t) => ["todo", "in_progress", "needs_look"].includes(t.status) },
      dueWeek: { label: "Due this week", fn: (t) => ["todo","in_progress","needs_look"].includes(t.status) && t.due_date && t.due_date >= wa && t.due_date <= wb },
      overdue: { label: "Overdue", fn: (t) => ["todo","in_progress","needs_look"].includes(t.status) && t.due_date && t.due_date < today },
      unassigned: { label: "Unassigned (no due date or no client)", fn: (t) => ["todo","in_progress","needs_look"].includes(t.status) && (!t.due_date || !t.workspace_id) },
    };
    const filtered = cardFilter && FILTERS[cardFilter] ? myTasks.filter(FILTERS[cardFilter].fn) : [];
    const card = (label, n, fkey, numColor) => (
      <div className="card" style={{ margin: 0, cursor: "pointer", outline: cardFilter === fkey ? "2px solid var(--gold,#F7C948)" : "none" }} onClick={() => setCardFilter(cardFilter === fkey ? null : fkey)}>
        <div style={{ fontSize: 12, color: "var(--faint)" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: numColor || "var(--text)" }}>{n}</div>
      </div>
    );
    const askVelvet = async (q) => {
      const text = (q ?? askInput).trim(); if (!text || askBusy) return;
      const thread = [...askThread, { role: "user", content: text }];
      setAskThread(thread); setAskInput(""); setAskBusy(true); setAskErr("");
      try {
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch("/api/ask-velvet", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ messages: thread, context: askContext || undefined }) });
        const j = await res.json(); setAskBusy(false);
        if (!res.ok) { setAskErr(j.error || "Ask Velvet couldn't answer."); return; }
        setAskThread([...thread, { role: "assistant", content: j.answer || "No answer." }]);
        if (j.context) setAskContext(j.context);
      } catch (e) { setAskBusy(false); setAskErr("Ask Velvet error: " + (e?.message || String(e))); }
    };
    const askReset = () => { setAskThread([]); setAskContext(""); setAskErr(""); setAskInput(""); };

    return (
      <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
        <div className="page-head">
          <div><h1 style={{ fontSize: 24 }}>Welcome, {firstName}</h1>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{svcLine}</div></div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New item</button>
        </div>

        {/* Ask Velvet, docked at the top */}
        <div style={{ background: "#0B0D12", borderRadius: 14, padding: 16, marginBottom: 14, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>✨ Ask Velvet</b>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {askThread.length > 0 && <span onClick={askReset} style={{ fontSize: 12, color: "#9AA3B2", cursor: "pointer" }}>New chat</span>}
              <span style={{ fontSize: 11, color: "#9AA3B2", border: "0.5px solid #2A3550", borderRadius: 20, padding: "2px 10px" }}>agency only</span>
            </span>
          </div>

          {askThread.length === 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <button onClick={() => askVelvet(`How is ${topClient} doing vs competitors?`)} disabled={askBusy} style={{ background: "var(--gold,#F7C948)", color: "#0B0D12", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>How is {topClient} doing vs competitors?</button>
              <button onClick={() => askVelvet("Summarise this week's SEO wins")} disabled={askBusy} style={{ background: "transparent", color: "#E7EAF0", border: "0.5px solid #2A3550", borderRadius: 20, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>Summarise this week's SEO wins</button>
            </div>
          )}

          {askThread.length > 0 && (
            <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {askThread.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? "var(--gold,#F7C948)" : "#15181F", color: m.role === "user" ? "#0B0D12" : "#E7EAF0", border: m.role === "user" ? "none" : "0.5px solid #2A3550", borderRadius: 12, padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.content}</div>
              ))}
              {askBusy && <div style={{ alignSelf: "flex-start", color: "#9AA3B2", fontSize: 12, padding: "4px 2px" }}>Ask Velvet is reading the latest data…</div>}
            </div>
          )}
          {askThread.length === 0 && askBusy && <div style={{ fontSize: 12, color: "#9AA3B2", marginBottom: 10 }}>Ask Velvet is reading the latest data…</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <input value={askInput} onChange={(e) => setAskInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") askVelvet(); }} placeholder={askThread.length ? "Reply…" : "Ask about any client's performance…"} style={{ flex: 1, background: "#15181F", border: "0.5px solid #2A3550", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14 }} />
            <button onClick={() => askVelvet()} disabled={askBusy} style={{ background: "var(--gold,#F7C948)", color: "#0B0D12", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{askBusy ? "…" : "Ask"}</button>
          </div>
          {askErr && <div style={{ fontSize: 12, color: "#F2B4A3", marginTop: 10 }}>{askErr}</div>}
        </div>

        {/* status view */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
          {card("In progress", cIn, "in_progress")}
          {card("Awaiting client", cAwait, "awaiting")}
          {card("Back to me", cBack, "back", cBack ? "#B4640C" : null)}
          {card("Done this quarter", cDone, "done", "#177E4E")}
        </div>

        {/* due-date view */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
          {card("Open tasks", openT.length, "open")}
          {card("Due this week", cDueWeek, "dueWeek", cDueWeek ? "#9A6B00" : null)}
          {card("Overdue", cOverdue, "overdue", cOverdue ? "#C0392B" : null)}
          {card("Unassigned tasks", cUnassigned, "unassigned", cUnassigned ? "#7C3AED" : null)}
        </div>

        {cardFilter && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <b>{FILTERS[cardFilter].label} · {filtered.length}</b>
              <span style={{ cursor: "pointer", color: "var(--faint)" }} onClick={() => setCardFilter(null)}>✕ close</span>
            </div>
            {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No tasks here.</div>
              : filtered.map((t) => { const pill = PILL[t.status] || PILL.todo; return (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "0.5px solid var(--line)" }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 13 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{t.workspace_id ? t.client : "Personal"}{t.status === "delivered" ? " · submitted " + new Date(t.updated_at).toLocaleDateString() : (t.due_date ? " · due " + t.due_date : "")}</div></div>
                  <span style={{ display: "flex", gap: 6, alignItems: "center", flex: "none" }}>
                    <span className="pill" style={{ background: pill.bg, color: pill.fg }}>{pill.l}</span>
                    {t.workspace_id && <button className="btn btn-ghost" onClick={() => router.push(`/client/${t.workspace_id}/service/${t.service_key}`)}>Open</button>}
                  </span>
                </div>); })}
          </div>
        )}

        {/* date tabs + priority queue */}
        <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 10 }}>
          {TABS.map(([v, l]) => (<button key={v} onClick={() => setMyTab(v)} className="btn" style={{ padding: "6px 12px", fontSize: 13, background: myTab === v ? "#fff" : "transparent", boxShadow: myTab === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: myTab === v ? "var(--text)" : "var(--muted)" }}>{l}</button>))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Priority queue <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 400 }}>· {queue.length} task(s), highest priority first</span></div>
        {queue.length === 0 ? <div className="empty" style={{ marginTop: 8 }}>Nothing due in this range. Switch the range above, or give a task a due date.</div>
          : <div className="card">{queue.map((t) => { const pm = PRIO_META[t.priority] || PRIO_META.medium; const pill = PILL[t.status] || PILL.todo; const overdue = t.due_date && t.due_date < today; return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{t.workspace_id ? t.client + " · " : "Personal · "}{SVC_LABEL[t.service_key] || t.service_key}{t.due_date ? " · due " + t.due_date : ""}</div></div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "none" }}>
                  <span className="pill" style={{ background: pm.bg, color: pm.fg }}>{pm.l}</span>
                  <span className="pill" style={{ background: overdue ? "#FBEAE6" : pill.bg, color: overdue ? "#C0392B" : pill.fg }}>{overdue ? "Overdue" : pill.l}</span>
                  {t.workspace_id && <button className="btn btn-ghost" onClick={() => router.push(`/client/${t.workspace_id}/service/${t.service_key}`)}>Open</button>}
                </div></div>); })}</div>}

        {/* What needs attention */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><b>What needs attention</b><span className="pill p-agency">demo signals</span></div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "#FCEFC3", color: "#7A5B00", fontWeight: 700, fontSize: 13, flex: "none" }}>58</span>
            <div><div style={{ fontSize: 13 }}>{topClient} · organic clicks down 18% on the top landing page</div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>Urgency 58 · Confidence 62% · low risk</div></div>
          </div>
        </div>

        {/* My work */}
        <div className="card">
          <b>My work</b>
          {myTasks.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 8 }}>No tasks assigned to you yet.</div>
            : myTasks.map((t) => { const pill = PILL[t.status] || PILL.todo; return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 0", borderTop: "0.5px solid var(--line)", cursor: t.workspace_id ? "pointer" : "default" }} onClick={() => t.workspace_id && router.push(`/client/${t.workspace_id}/service/${t.service_key}`)}>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 14 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 1 }}>{t.workspace_id ? t.client : "Personal"}</div></div>
                <span className="pill" style={{ background: pill.bg, color: pill.fg, flex: "none" }}>{pill.l}</span>
              </div>); })}
        </div>

        {/* My clients */}
        <div className="card">
          <b>My clients</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {myClients.length === 0 ? <span style={{ fontSize: 13, color: "var(--faint)" }}>No clients assigned yet.</span>
              : myClients.map((c) => (<button key={c.id} className="pill" style={{ border: "0.5px solid var(--line)", cursor: "pointer" }} onClick={() => router.push(`/client/${c.id}/service/${c.serviceKey}`)}>{c.name}</button>))}
          </div>
        </div>

        {showAdd && <AddTask me={profile.id} clients={myClients} onClose={() => setShowAdd(false)} onCreated={() => window.location.reload()} />}
      </Shell>
    );
  }

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Active clients</h1>
        <span className="pill p-agency">{roleLabel}</span>
      </div>

      {richClients.length === 0 ? (
        <div className="empty">No active clients yet. Clients appear here once their onboarding is complete.</div>
      ) : richClients.map((c) => {
        const h = HEALTH[c.health] || HEALTH.healthy;
        return (
          <div className="card" key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div><b style={{ fontSize: 16 }}>{c.name}</b>{c.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{[c.industry, c.website, c.start_date ? "since " + c.start_date : null].filter(Boolean).join(" · ") || "No details yet"}</div></div>
              <span className="pill" style={{ background: h.bg, color: h.fg }}>{h.label}</span>
            </div>

            {c.services.length > 0 && <>
              <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 5 }}>Services</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {c.services.map((s) => <span key={s} className="pill p-agency">{s}</span>)}
              </div>
            </>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ background: "var(--cloud, #F5F6F8)", borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 6 }}>Team by department</div>
                {c.team.length === 0 ? <div style={{ fontSize: 12, color: "var(--faint)" }}>No one assigned yet</div>
                  : c.team.map((d) => <div key={d.dept} style={{ fontSize: 12, marginBottom: 3 }}><b style={{ color: DEPT_COLOR[d.dept] || "var(--text)" }}>{d.dept}</b> · {d.members.join(", ")}</div>)}
              </div>
              <div style={{ background: "var(--cloud, #F5F6F8)", borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 6 }}>Latest feedback</div>
                {c.feedback ? <><div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 22, fontWeight: 600 }}>{c.feedback.overall ?? "—"}</span><span style={{ fontSize: 11, color: "var(--faint)" }}>/10 overall</span></div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{new Date(c.feedback.date).toLocaleDateString()} · <span style={{ color: "#2557C7", cursor: "pointer" }} onClick={() => router.push("/feedback")}>View history</span></div></>
                  : <div style={{ fontSize: 12, color: "var(--faint)" }}>None yet</div>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ border: "0.5px solid #F0D9A6", background: "#FEFBF2", borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 11, color: "#9A6B00", marginBottom: 5 }}>Upsell opportunities</div>
                <div style={{ fontSize: 12, color: c.upsell ? "var(--text)" : "var(--faint)" }}>{c.upsell || "None noted"}</div>
              </div>
              <div style={{ border: "0.5px solid var(--line)", borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 5 }}>Notes</div>
                <div style={{ fontSize: 12, color: c.notes ? "var(--text)" : "var(--faint)" }}>{c.notes || "No notes"}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              {c.canEditMeta && <button className="btn btn-ghost" onClick={() => openMeta(c)}>Edit health / upsell / notes</button>}
              <button className="btn btn-primary" onClick={() => router.push(`/client/${c.id}`)}>Open client →</button>
            </div>
          </div>
        );
      })}

      {editMeta && (
        <Modal title={`Edit ${editMeta.name}`} onClose={() => setEditMeta(null)}>
          <form onSubmit={saveMeta}>
            <div className="field"><label>Health status</label>
              <select className="input" value={editMeta.health} onChange={(e) => setEditMeta({ ...editMeta, health: e.target.value })}>
                <option value="healthy">Healthy</option><option value="watch">To watch</option><option value="risk">At risk</option>
              </select></div>
            <div className="field"><label>Upsell opportunities</label>
              <textarea className="input" rows={2} value={editMeta.upsell} onChange={(e) => setEditMeta({ ...editMeta, upsell: e.target.value })} /></div>
            <div className="field"><label>Notes</label>
              <textarea className="input" rows={3} value={editMeta.notes} onChange={(e) => setEditMeta({ ...editMeta, notes: e.target.value })} /></div>
            {metaErr && <div className="auth-msg auth-err">{metaErr}</div>}
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
