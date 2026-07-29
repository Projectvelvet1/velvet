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
    const open = myTasks.filter((t) => ["todo", "in_progress", "needs_look"].includes(t.status));
    const counts = {
      open: open.length,
      dueWeek: open.filter((t) => { const [a, b] = rangeBounds("this_week"); return t.due_date && t.due_date >= a && t.due_date <= b; }).length,
      overdue: open.filter((t) => t.due_date && t.due_date < today).length,
      awaiting: myTasks.filter((t) => t.status === "delivered").length,
    };
    const [ra, rb] = rangeBounds(myTab);
    const queue = open.filter((t) => t.due_date && t.due_date >= ra && t.due_date <= rb)
      .sort((x, y) => (PRIO_W[y.priority] || 1) - (PRIO_W[x.priority] || 1) || (x.due_date || "").localeCompare(y.due_date || ""));
    const TABS = [["today", "Today"], ["this_week", "This week"], ["this_month", "This month"], ["this_quarter", "This quarter"]];
    const card = (label, n, color) => (<div className="card" style={{ margin: 0 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{label}</div><div style={{ fontSize: 26, fontWeight: 600, color: color || "var(--text)" }}>{n}</div></div>);
    return (
      <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
        <div className="page-head">
          <div><h1 style={{ fontSize: 24 }}>Welcome, {firstName}</h1>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{myServiceLine ? myServiceLine + " · your workspace" : "Your workspace"}</div></div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add task</button>
        </div>

        {/* status view (existing) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          {card("In progress", myCounts.in_progress)}
          {card("Awaiting client", myCounts.delivered)}
          {card("Back to you", myCounts.needs_look, myCounts.needs_look ? "#B4640C" : null)}
          {card("Done this month", myCounts.done, "#177E4E")}
        </div>

        {/* due-date view (new, below) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
          {card("Open tasks", counts.open)}
          {card("Due this week", counts.dueWeek, counts.dueWeek ? "#9A6B00" : null)}
          {card("Overdue", counts.overdue, counts.overdue ? "#C0392B" : null)}
          {card("Awaiting client", counts.awaiting, "#7C3AED")}
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 10 }}>
          {TABS.map(([v, l]) => (<button key={v} onClick={() => setMyTab(v)} className="btn" style={{ padding: "6px 12px", fontSize: 13, background: myTab === v ? "#fff" : "transparent", boxShadow: myTab === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: myTab === v ? "var(--text)" : "var(--muted)" }}>{l}</button>))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Priority queue <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 400 }}>· {queue.length} task(s), highest priority first</span></div>
        {queue.length === 0 ? <div className="empty" style={{ marginTop: 8 }}>Nothing due in this range. Switch the range above, or give a task a due date.</div>
          : <div className="card">{queue.map((t) => {
              const pm = PRIO_META[t.priority] || PRIO_META.medium; const st = TSTATUS[t.status] || TSTATUS.todo; const overdue = t.due_date && t.due_date < today;
              return (<div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{t.workspace_id ? t.client + " · " : "Personal · "}{SVC_LABEL[t.service_key] || t.service_key}{t.due_date ? " · due " + t.due_date : ""}</div></div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "none" }}>
                  <span className="pill" style={{ background: pm.bg, color: pm.fg }}>{pm.l}</span>
                  <span className="pill" style={{ background: overdue ? "#FBEAE6" : st.bg, color: overdue ? "#C0392B" : st.fg }}>{overdue ? "Overdue" : st.l}</span>
                  {t.workspace_id && <button className="btn btn-ghost" onClick={() => router.push(`/client/${t.workspace_id}/service/${t.service_key}`)}>Open</button>}
                </div></div>);
            })}</div>}

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><b>What needs attention</b><span className="pill p-agency">demo</span></div>
          {myCounts.needs_look > 0 ? <div style={{ fontSize: 13 }}>{myCounts.needs_look} item(s) came back from a client — see "Back to you".</div>
            : <div style={{ fontSize: 13, color: "var(--faint)" }}>Nothing needs your attention right now. The AI signals feed arrives with the analytics wiring.</div>}
        </div>

        <div className="card">
          <b>My clients</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {myClients.length === 0 ? <span style={{ fontSize: 13, color: "var(--faint)" }}>No clients assigned yet.</span>
              : myClients.map((c) => (<button key={c.id} className="pill" style={{ border: "0.5px solid var(--line)", cursor: "pointer" }} onClick={() => router.push(`/client/${c.id}/service/${c.serviceKey}`)}>{c.name} →</button>))}
          </div>
        </div>

        <div className="card" style={{ opacity: 0.7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Ask Velvet</b><span className="pill p-agency">coming soon</span></div>
          <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 6 }}>Your AI copilot for this workspace lands in a later build.</div>
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
