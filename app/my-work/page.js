"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import AddTask from "../../components/AddTask";
import AskVelvet from "../../components/AskVelvet";
import TaskDetail from "../../components/TaskDetail";
import { departmentsForRole, DEPARTMENTS } from "../../lib/agencyNav";
import { cachedProfile } from "../../lib/cache";

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

export default function MyWork() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myClients, setMyClients] = useState([]);
  const [myServiceLine, setMyServiceLine] = useState("");
  const [myTab, setMyTab] = useState("this_week");
  const [showAdd, setShowAdd] = useState(false);
  const [cardFilter, setCardFilter] = useState(null);
  const [openTask, setOpenTask] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const p = (await cachedProfile()) || { id: uid, email: session.user.email, side: "agency" };
      setProfile(p);
      if (p.side === "client") { router.replace("/dashboard"); return; }

      const { data: all } = await supabase.from("workspaces").select("id,name,project_lead_id");
      const { data: assignsMine } = await supabase.from("service_assignments").select("service_key,workspace_id").eq("profile_id", uid);
      const seesAll = !!p.is_super_admin || (all || []).some((w) => w.project_lead_id === uid);
      setDepts(departmentsForRole({ seesAll, assignedServiceKeys: new Set((assignsMine || []).map((a) => a.service_key)) }));

      const nameOf = (wid) => ((all || []).find((w) => w.id === wid)?.name) || "Client";
      const seen = {}; const myCl = [];
      (assignsMine || []).forEach((a) => { if (!seen[a.workspace_id]) { seen[a.workspace_id] = a.service_key; myCl.push({ id: a.workspace_id, name: nameOf(a.workspace_id), serviceKey: a.service_key }); } });
      setMyClients(myCl);
      const svcKeys = [...new Set((assignsMine || []).map((a) => a.service_key))];
      setMyServiceLine(svcKeys.map((k) => SVC_LABEL[k] || k).join(", "));
      const { data: mine } = await supabase.from("tasks").select("id,title,status,workspace_id,service_key,updated_at,due_date,priority,description,deliverable_link,frequency,client_note,assignee_id,created_by").eq("assignee_id", uid).order("updated_at", { ascending: false });
      setMyTasks((mine || []).map((t) => ({ ...t, client: nameOf(t.workspace_id) })));
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="center">Loading your work…</div>;

  const roleLabel = profile?.is_super_admin ? "Super admin" : "Team member";
  const nav = <AgencyNav profile={profile} active="mywork" depts={depts} />;
  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0].split("@")[0];
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
  const assignedToMe = myTasks.filter((t) => t.created_by && t.created_by !== profile?.id).length;
  const [ra, rb] = rangeBounds(myTab);
  const queue = openT.filter((t) => t.due_date && t.due_date >= ra && t.due_date <= rb).sort((x, y) => (PRIO_W[y.priority] || 1) - (PRIO_W[x.priority] || 1) || (x.due_date || "").localeCompare(y.due_date || ""));
  const TABS = [["today", "Today"], ["this_week", "This week"], ["this_month", "This month"], ["this_quarter", "This quarter"]];
  const topClient = myClients[0]?.name || "your client";
  const PILL = { todo: { l: "To do", bg: "#EEF0FF", fg: "#3B49C7" }, in_progress: { l: "In progress", bg: "#FCEFC3", fg: "#7A5B00" }, delivered: { l: "Awaiting client", bg: "#F0E9FB", fg: "#7C3AED" }, needs_look: { l: "Needs another look", bg: "#FDEBD3", fg: "#B4640C" }, reviewed: { l: "Reviewed", bg: "#E7F6EF", fg: "#177E4E" } };
  const FILTERS = {
    in_progress: { label: "In progress", fn: (t) => t.status === "in_progress" },
    awaiting: { label: "Awaiting client", fn: (t) => t.status === "delivered" },
    back: { label: "Back to me", fn: (t) => t.status === "needs_look" },
    done: { label: "Done this quarter", fn: (t) => (t.status === "delivered" || t.status === "reviewed") && inQ(t.updated_at) },
    open: { label: "Open tasks", fn: (t) => ["todo", "in_progress", "needs_look"].includes(t.status) },
    dueWeek: { label: "Due this week", fn: (t) => ["todo", "in_progress", "needs_look"].includes(t.status) && t.due_date && t.due_date >= wa && t.due_date <= wb },
    overdue: { label: "Overdue", fn: (t) => ["todo", "in_progress", "needs_look"].includes(t.status) && t.due_date && t.due_date < today },
    assigned: { label: "Tasks Assigned", fn: (t) => t.created_by && t.created_by !== profile?.id },
  };
  const filtered = cardFilter && FILTERS[cardFilter] ? myTasks.filter(FILTERS[cardFilter].fn) : [];
  const card = (label, n, fkey, numColor) => (
    <div className="card" style={{ margin: 0, cursor: "pointer", outline: cardFilter === fkey ? "2px solid var(--gold,#F7C948)" : "none" }} onClick={() => setCardFilter(cardFilter === fkey ? null : fkey)}>
      <div style={{ fontSize: 12, color: "var(--faint)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: numColor || "var(--text)" }}>{n}</div>
    </div>
  );

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head">
        <div><h1 style={{ fontSize: 24 }}>Welcome, {firstName}</h1>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{myServiceLine || "Your workspace"}</div></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New item</button>
      </div>

      <AskVelvet suggestions={[`How is ${topClient} doing vs competitors?`, "Summarise this week's wins"]} />
      {openTask && <TaskDetail task={openTask} onClose={() => setOpenTask(null)} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {card("In progress", cIn, "in_progress")}
        {card("Awaiting client", cAwait, "awaiting")}
        {card("Back to me", cBack, "back", cBack ? "#B4640C" : null)}
        {card("Done this quarter", cDone, "done", "#177E4E")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {card("Open tasks", openT.length, "open")}
        {card("Due this week", cDueWeek, "dueWeek", cDueWeek ? "#9A6B00" : null)}
        {card("Overdue", cOverdue, "overdue", cOverdue ? "#C0392B" : null)}
        {card("Tasks Assigned", assignedToMe, "assigned", assignedToMe ? "#2557C7" : null)}
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
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{t.workspace_id ? t.client : "Personal"}{t.due_date ? " · due " + t.due_date : ""}</div></div>
                <span style={{ display: "flex", gap: 6, alignItems: "center", flex: "none" }}>
                  <span className="pill" style={{ background: pill.bg, color: pill.fg }}>{pill.l}</span>
                  <button className="btn btn-ghost" onClick={() => setOpenTask(t)}>Open</button>
                </span>
              </div>); })}
        </div>
      )}

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
                <button className="btn btn-ghost" onClick={() => setOpenTask(t)}>Open</button>
              </div></div>); })}</div>}

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
