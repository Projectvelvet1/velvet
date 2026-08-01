"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "./Shell";
import Modal from "./Modal";
import TaskDetail from "./TaskDetail";
import AssignTask from "./AssignTask";
import { loadQuestions } from "../lib/onboardingQuestions";
import { supabase } from "../lib/supabase";

const DEPT_LABEL = { performance: "Performance", content: "Content", analytics: "Analytics" };
const ALL_SERVICES = [
  { key: "paid_media", label: "Paid Media", dep: "performance" }, { key: "seo", label: "SEO", dep: "performance" }, { key: "aso", label: "ASO", dep: "performance" },
  { key: "creative_strategy", label: "Creative Strategy", dep: "content" }, { key: "asset_production", label: "Asset Production", dep: "content" }, { key: "ugc", label: "UGC", dep: "content" },
  { key: "tracking", label: "Tracking", dep: "analytics" }, { key: "dashboarding", label: "Dashboarding", dep: "analytics" },
];

export default function ClientView({ workspace, services = [], profile, viewingAs = false, onBack }) {
  const router = useRouter();
  const isProspect = workspace?.phase === "prospect";
  const onboarded = !!workspace?.onboarding_complete;
  const firstName = (profile?.full_name || profile?.email || workspace?.name || "there").split(" ")[0].split("@")[0];
  const answersPhase = isProspect ? "discovery" : "full";
  const onbHref = viewingAs ? `/onboarding?ws=${workspace.id}` : "/onboarding";
  useEffect(() => {
    if (viewingAs || !meId || !workspace?.id) return;
    (async () => {
      const { data } = await supabase.from("tasks").select("id,title,status,assignee_id,client_note,created_at,due_date,priority,frequency,description,deliverable_link,updated_at,share_with").eq("workspace_id", workspace.id).or(`assignee_id.eq.${meId},share_with.eq.client`).order("created_at", { ascending: false });
      setMyTasks(data || []);
    })();
  }, [meId, workspace?.id, viewingAs]);
  const grouped = {}; services.forEach((s) => { (grouped[s.department] ||= []).push(s); });

  // ---- onboarding answers ----
  const [flat, setFlat] = useState([]);
  const [openKey, setOpenKey] = useState(null);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [svcPeople, setSvcPeople] = useState({});
  const [allTeam, setAllTeam] = useState([]);
  const [deptOpen, setDeptOpen] = useState(null);
  const [meId, setMeId] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [clientTab, setClientTab] = useState("home");
  const [myTasks, setMyTasks] = useState([]);
  const [openTask, setOpenTask] = useState(null);
  const [cvAgency, setCvAgency] = useState([]);
  const [cvClient, setCvClient] = useState([]);
  const [team, setTeam] = useState(null);
  const [tName, setTName] = useState(""); const [tEmail, setTEmail] = useState(""); const [tSvc, setTSvc] = useState("");
  const [teamBusy, setTeamBusy] = useState(false); const [teamErr, setTeamErr] = useState(""); const [teamMsg, setTeamMsg] = useState("");
  const [answers, setAnswers] = useState({});
  const [hasAny, setHasAny] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [dDraft, setDDraft] = useState({});
  const [dBusy, setDBusy] = useState(false);
  const [dErr, setDErr] = useState("");
  const [wsLocal, setWsLocal] = useState(workspace);
  const [fbQs, setFbQs] = useState([]);
  const [showFb, setShowFb] = useState(false);
  const [fbScores, setFbScores] = useState({});
  const [fbOverall, setFbOverall] = useState(0);
  const [fbAns, setFbAns] = useState({});
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);

  useEffect(() => { setWsLocal(workspace); }, [workspace]);
  async function loadAssignments() {
    if (!workspace?.id) return;
    const { data: everyone } = await supabase.from("profiles").select("id,full_name,email,home_department,home_service").eq("side", "agency");
    setAllTeam(everyone || []);
    const nameOf = (id) => { const pr = (everyone || []).find((x) => x.id === id); return pr ? (pr.full_name || pr.email) : "Unknown"; };
    const { data: asg } = await supabase.from("service_assignments").select("service_key,profile_id").eq("workspace_id", workspace.id);
    const map = {}; (asg || []).forEach((a) => { (map[a.service_key] ||= []).push({ id: a.profile_id, name: nameOf(a.profile_id) }); });
    setSvcPeople(map);
  }
  useEffect(() => { if (viewingAs && workspace?.id) loadAssignments(); }, [viewingAs, workspace?.id]);
  async function loadTeam() {
    if (viewingAs || !workspace?.id) return;
    const { data: sess } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id || null);
    const res = await fetch(`/api/client-team?workspaceId=${workspace.id}`, { headers: { Authorization: `Bearer ${sess.session?.access_token}` } });
    if (res.ok) { const j = await res.json(); setTeam(j); setCvAgency(j.agencyPeople || []); setCvClient(j.clientPeople || []); }
  }
  useEffect(() => { if (!viewingAs && workspace?.id) loadTeam(); }, [viewingAs, workspace?.id]);
  async function addTeam(e) {
    e.preventDefault(); setTeamErr(""); setTeamMsg("");
    if (!tName.trim() || !tEmail.trim() || !tSvc) { setTeamErr("Add a name, company email and the service they handle."); return; }
    setTeamBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/client-team", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ workspaceId: workspace.id, fullName: tName.trim(), email: tEmail.trim(), service: tSvc }) });
    const j = await res.json(); setTeamBusy(false);
    if (!res.ok) { setTeamErr(j.error || "Could not add."); return; }
    setTName(""); setTEmail(""); setTSvc(""); setTeamMsg("Invite sent — they'll set a password from the email."); loadTeam();
  }

  async function addAssignee(serviceKey, profileId) {
    if (!profileId) return;
    await supabase.from("service_assignments").insert({ workspace_id: workspace.id, service_key: serviceKey, profile_id: profileId });
    await supabase.from("memberships").upsert({ profile_id: profileId, workspace_id: workspace.id }, { onConflict: "profile_id,workspace_id", ignoreDuplicates: true });
    loadAssignments();
  }
  async function removeAssignee(serviceKey, profileId) {
    await supabase.from("service_assignments").delete().eq("workspace_id", workspace.id).eq("service_key", serviceKey).eq("profile_id", profileId);
    loadAssignments();
  }
  useEffect(() => {
    (async () => {
      if (!workspace?.id) return;
      const qs = await loadQuestions(answersPhase); setFlat(qs);
      const { data } = await supabase.from("onboarding_responses").select("question_key,answer").eq("workspace_id", workspace.id).eq("phase", answersPhase);
      const a = {}; (data || []).forEach((r) => (a[r.question_key] = r.answer));
      setAnswers(a); setHasAny((data || []).some((r) => (r.answer || "").trim()));
      if (!viewingAs && !isProspect) {
        const { data: fq } = await supabase.from("feedback_questions").select("question_key,label,sort_order").order("sort_order");
        setFbQs(fq || []);
      }
    })();
  }, [workspace?.id, answersPhase]);

  function openEdit() { setDraft({ ...answers }); setShowEdit(true); }
  async function saveAnswers(e) {
    e.preventDefault(); setSaving(true);
    const rows = flat.map((q) => ({ workspace_id: workspace.id, phase: answersPhase, question_key: q.key, answer: draft[q.key] || "", updated_at: new Date().toISOString() }));
    await supabase.from("onboarding_responses").upsert(rows, { onConflict: "workspace_id,phase,question_key" });
    setAnswers({ ...draft }); setHasAny(Object.values(draft).some((v) => (v || "").trim())); setSaving(false); setShowEdit(false);
  }

  function openDetails() { setDErr(""); setDDraft({ website: wsLocal.website || "", industry: wsLocal.industry || "", startDate: wsLocal.start_date || "", leadName: wsLocal.lead_name || "", leadEmail: "" }); setShowDetails(true); }
  async function saveDetails(e) {
    e.preventDefault(); setDBusy(true); setDErr("");
    // write directly under the DB rule (no API route in the path)
    const patch = {
      website: (dDraft.website || "").trim() || null,
      industry: (dDraft.industry || "").trim() || null,
      start_date: (dDraft.startDate || "").trim() || null,
      lead_name: (dDraft.leadName || "").trim() || null,
    };
    const { error } = await supabase.from("workspaces").update(patch).eq("id", wsLocal.id);
    if (error) { setDBusy(false); setDErr(error.message || "Could not save."); return; }
    // re-read from the DB so what we show is exactly what was saved
    const { data: fresh } = await supabase.from("workspaces").select("website,industry,start_date,lead_name,health,upsell,notes").eq("id", wsLocal.id).single();
    // optional lead-email change still needs the admin route (invite); best-effort
    const le = (dDraft.leadEmail || "").trim();
    if (le && le.includes("@")) {
      const { data } = await supabase.auth.getSession();
      await fetch("/api/client-details", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ workspaceId: wsLocal.id, leadEmail: le, leadName: dDraft.leadName }) }).catch(() => {});
    }
    setDBusy(false); setDErr("");
    if (fresh) setWsLocal({ ...wsLocal, ...fresh });
    setShowDetails(false);
  }

  function openFb() { const init = {}; (services || []).forEach((s) => { init[s.service_key] = 5; }); setFbScores(init); setFbOverall(5); setFbAns({}); setFbDone(false); setShowFb(true); }
  async function sendFeedback(e) {
    e.preventDefault(); setFbBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: sub } = await supabase.from("feedback_submissions").insert({ workspace_id: workspace.id, submitted_by: session?.user?.id || null, overall_score: fbOverall || null }).select("id").single();
    if (sub?.id) {
      const scoreRows = services.map((s) => ({ submission_id: sub.id, service_key: s.service_key, score: fbScores[s.service_key] || null }));
      if (scoreRows.length) await supabase.from("feedback_service_scores").insert(scoreRows);
      const ansRows = fbQs.map((q) => ({ submission_id: sub.id, question_key: q.question_key, answer: fbAns[q.question_key] || "" }));
      if (ansRows.length) await supabase.from("feedback_answers").insert(ansRows);
    }
    setFbBusy(false); setFbDone(true);
  }

  // ---- sidebar ----
  let nav;
  if (isProspect) {
    nav = (<>
      <div className="grp">Account</div>
      <nav className="nav"><a className="on">Onboarding</a></nav>
      <div className="grp">What we offer</div>
      <nav className="nav">
        {ALL_SERVICES.map((s) => (
          <a key={s.key} className={"svc-menu svc svc-" + s.key} style={{ opacity: .35, cursor: "default", filter: "blur(0.4px)" }}><span className="svc-dot" />{s.label}</a>
        ))}
      </nav>
    </>);
  } else {
    nav = (<>
      <div className="grp">Account</div>
      <nav className="nav">
        <a className="on">Onboarding</a>
        <a style={{ opacity: onboarded ? 1 : .4, cursor: onboarded ? "pointer" : "default" }} onClick={() => onboarded && !viewingAs && setClientTab("settings")}>Team</a>
      </nav>
      {Object.keys(grouped).map((dep) => (
        <div key={dep}>
          <div className="grp">{DEPT_LABEL[dep] || dep}</div>
          <nav className="nav">
            {grouped[dep].map((s) => (
              <a key={s.service_key} className={"svc-menu svc svc-" + s.service_key} style={{ opacity: onboarded ? 1 : .4, cursor: onboarded ? "pointer" : "default" }} onClick={() => onboarded && router.push(`/client/${workspace.id}/service/${s.service_key}`)}><span className="svc-dot" />{s.service_label}</a>
            ))}
          </nav>
        </div>
      ))}
    </>);
  }

  const DEP_COLOR = { performance: "#C0392B", content: "#7C3AED", analytics: "#1E7F5C" };
  const SVC_DEP = {}; ALL_SERVICES.forEach((x) => { SVC_DEP[x.key] = x.dep; });
  const deptDrilldown = (
    <>
      <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Departments</h3>
      <p style={{ fontSize: 12, color: "var(--faint)", marginTop: -4, marginBottom: 10 }}>Open a department to see this client's services, the team on each, and their live dashboards.</p>
      {Object.keys(grouped).length === 0 ? <div className="empty">No services yet.</div>
        : ["performance", "content", "analytics"].filter((d) => grouped[d]).map((dep) => {
          const open = deptOpen === dep;
          return (
            <div className="card" key={dep} style={{ padding: 0, overflow: "hidden" }}>
              <div onClick={() => setDeptOpen(open ? null : dep)} style={{ cursor: "pointer", padding: "13px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ color: DEP_COLOR[dep] }}>{DEPT_LABEL[dep]}</b>
                <span style={{ color: "var(--faint)" }}>{open ? "▾" : "▸"}</span>
              </div>
              {open && (
                <div style={{ padding: "0 12px 10px" }}>
                  {grouped[dep].map((s) => {
                    const people = svcPeople[s.service_key] || [];
                    const assignedIds = new Set(people.map((p) => p.id));
                    const eligible = allTeam.filter((t) => t.home_service === s.service_key && !assignedIds.has(t.id));
                    return (
                      <div key={s.service_key} style={{ padding: "10px 6px", borderTop: "0.5px solid var(--line)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.service_label}</div>
                          <button className="btn btn-ghost" onClick={() => router.push(`/client/${workspace.id}/service/${s.service_key}`)}>Open dashboard →</button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {people.length === 0 && <span style={{ fontSize: 11, color: "var(--faint)" }}>No one assigned</span>}
                          {people.map((pp) => (
                            <span key={pp.id} className="pill" style={{ border: "0.5px solid var(--line)", display: "flex", alignItems: "center", gap: 6 }}>{pp.name}
                              <span style={{ cursor: "pointer", color: "var(--faint)" }} onClick={() => removeAssignee(s.service_key, pp.id)}>✕</span></span>
                          ))}
                        </div>
                        <select className="input" style={{ marginTop: 8, maxWidth: 260 }} value="" onChange={(e) => addAssignee(s.service_key, e.target.value)}>
                          <option value="">{eligible.length ? "+ Add a " + DEPT_LABEL[dep] + " teammate…" : "No " + DEPT_LABEL[dep] + " teammates free (set their department on Team)"}</option>
                          {eligible.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </>
  );

  const banner = viewingAs ? (
    <div className="viewbar">
      <div><b>Viewing as {workspace.name}</b> · you can act on this client's behalf</div>
      <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={onBack}>← Back</button>
    </div>
  ) : null;
  const footer = viewingAs ? <button className="signout" onClick={onBack}>← Back to agency</button> : null;
  const shellProfile = viewingAs ? { full_name: workspace.name, email: "" } : profile;

  const answersSection = (
    <>
      <div className="page-head" style={{ marginTop: 26, marginBottom: 10 }}>
        <h3 style={{ fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onClick={() => setAnswersOpen((v) => !v)}>
          Onboarding answers <span style={{ color: "var(--faint)", fontSize: 15 }}>{answersOpen ? "▾" : "▸"}</span>
        </h3>
        {answersOpen && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={openEdit}>{hasAny ? "Edit answers" : "Fill in answers"}</button>
          </div>
        )}
      </div>
      {!answersOpen ? null : flat.length === 0 ? (
        <div className="empty">No questions have been set up yet.{viewingAs ? " Set them up in Settings → Onboarding questions." : ""}</div>
      ) : (
        <div className="faq">
          {flat.map((q) => {
            const open = openKey === q.key;
            const ans = (answers[q.key] || "").trim();
            return (
              <div className={"faq-item" + (open ? " open" : "")} key={q.key}>
                <button type="button" className="faq-q" onClick={() => setOpenKey(open ? null : q.key)}>
                  <span>{q.label}</span>
                  <span className="faq-caret">{open ? "–" : "+"}</span>
                </button>
                {open && (
                  <div className="faq-a" style={{ color: ans ? "var(--text)" : "var(--faint)" }}>{ans || "No answer yet."}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const assignModal = showAssign && meId ? <AssignTask me={meId} client={{ id: workspace.id, name: workspace.name }} serviceKey="general" agencyPeople={cvAgency} clientPeople={cvClient} onClose={() => setShowAssign(false)} onCreated={() => setShowAssign(false)} /> : null;

  return (
    <Shell profile={shellProfile} roleLabel={viewingAs ? "Client view" : "Client"} nav={nav} banner={banner} footer={footer}>
      {assignModal}
      {openTask && <TaskDetail task={openTask} onClose={() => setOpenTask(null)} />}
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>{viewingAs ? wsLocal.name : `Welcome, ${firstName}`}</h1>
        <span className="pill p-client">{isProspect ? "Discovery" : "Client"}</span>
      </div>

      {!viewingAs && !isProspect && clientTab === "home" && (
        <div className="card" style={{ borderColor: "var(--border-accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div><b>How are we doing?</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Share your feedback on the services we deliver.</div></div>
            <button className="btn btn-primary" onClick={openFb}>Give feedback</button>
          </div>
        </div>
      )}

      {viewingAs && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <b>Client details</b>
            <button className="btn btn-ghost" style={{ padding: "5px 10px" }} onClick={openDetails}>Edit details</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginTop: 10, fontSize: 13 }}>
            <div><div style={{ color: "var(--faint)", fontSize: 12 }}>Website</div>{wsLocal.website || "—"}</div>
            <div><div style={{ color: "var(--faint)", fontSize: 12 }}>Industry</div>{wsLocal.industry || "—"}</div>
            <div><div style={{ color: "var(--faint)", fontSize: 12 }}>Start date</div>{wsLocal.start_date || "—"}</div>
            <div><div style={{ color: "var(--faint)", fontSize: 12 }}>Client lead</div>{wsLocal.lead_name || "—"}</div>
          </div>
        </div>
      )}

      {isProspect ? (
        <>
          {!workspace.discovery_complete ? (
            <div className="card" style={{ borderColor: "var(--border-accent)" }}>
              <b>Welcome 👋 Let's understand your business</b>
              <p style={{ color: "var(--muted)", margin: "6px 0 14px", fontSize: 14 }}>
                {viewingAs ? "Fill in the discovery questions on this client's behalf." : "A few quick questions about your goals and challenges."}
              </p>
              <button className="btn btn-primary" onClick={() => router.push(onbHref)}>{viewingAs ? "Open discovery onboarding →" : "Start →"}</button>
            </div>
          ) : (
            <div className="card"><b>{viewingAs ? "Discovery completed" : "Thanks, we've got your answers 🙌"}</b>
              <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>{viewingAs ? "" : "Your Welcome Tomorrow team will be in touch shortly."}</p>
            </div>
          )}
          {answersSection}
          <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>What Welcome Tomorrow offers</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {ALL_SERVICES.map((s) => (
              <div key={s.key} className={"card svc-card svc svc-" + s.key} style={{ opacity: .5, filter: "blur(0.5px)", margin: 0 }}>
                <b>{s.label}</b><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{DEPT_LABEL[s.dep]}</div>
              </div>
            ))}
          </div>
        </>
      ) : !onboarded ? (
        <>
          <div className="card" style={{ borderColor: "var(--border-accent)" }}>
            <b>{viewingAs ? "Client onboarding" : "Welcome to Welcome Tomorrow 👋"}</b>
            <p style={{ color: "var(--muted)", margin: "6px 0 14px", fontSize: 14 }}>
              {viewingAs ? "Fill in onboarding on this client's behalf." : `Let's get ${workspace.name} set up. Completing onboarding unlocks your dashboards.`}
            </p>
            <button className="btn btn-primary" onClick={() => router.push(onbHref)}>{viewingAs ? "Open onboarding →" : "Start onboarding →"}</button>
          </div>
          {answersSection}
          <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>{viewingAs ? "Services" : "Your services"}</h3>
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 0 }}>These unlock once onboarding is complete.</p>
          {services.map((s) => (
            <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key} style={{ opacity: .55 }}>
              <b>{s.service_label}</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Locked until onboarding is complete</div>
            </div>
          ))}
        </>
      ) : viewingAs ? (
        <>
          <div className="card"><b>{workspace.name}</b><p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Dashboards are ready.</p></div>
          {answersSection}
          {deptDrilldown}
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 14 }}>
            {[["home", "Home"], ["tasks", "Tasks"], ["settings", "Settings"]].map(([v, l]) => (
              <button key={v} onClick={() => setClientTab(v)} className="btn" style={{ padding: "6px 16px", fontSize: 13, background: clientTab === v ? "#fff" : "transparent", boxShadow: clientTab === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: clientTab === v ? "var(--text)" : "var(--muted)" }}>{l}</button>
            ))}
          </div>
          {clientTab === "home" ? (
            <>
              <div className="card"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><b>{workspace.name}</b><p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Dashboards are ready.</p></div><button className="btn btn-primary" onClick={() => setShowAssign(true)}>Assign a task</button></div></div>
              {answersSection}
              <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Your services &amp; who handles them</h3>
              {(team?.agencyByService || services.map((s) => ({ service_key: s.service_key, service_label: s.service_label, department: DEPT_LABEL[s.department], people: [] }))).map((s) => (
                <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key} style={{ cursor: "pointer" }} onClick={() => router.push(`/client/${workspace.id}/service/${s.service_key}`)}>
                  <b>{s.service_label}</b>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{s.people && s.people.length ? "Your agency team: " + s.people.map((x) => x.name).join(", ") : "Team being assigned"}</div>
                </div>
              ))}
            </>
          ) : clientTab === "tasks" ? (
            <>
              <h3 style={{ fontSize: 16, margin: "6px 0 10px" }}>Your tasks</h3>
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 8 }}>Tasks the agency has assigned to you or shared with your team.</div>
                {myTasks.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>Nothing assigned to you yet.</div>
                  : myTasks.map((t) => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13 }}>{t.title}</div><div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{t.due_date ? "due " + t.due_date : "no due date"}</div></div>
                        <button className="btn btn-ghost" style={{ padding: "4px 10px", flex: "none" }} onClick={() => setOpenTask(t)}>Open</button>
                      </div>
                    ))}
              </div>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 16, margin: "6px 0 10px" }}>Your team</h3>
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 8 }}>Add your colleagues. Everyone you add gets the same access you have, and can assign tasks to your agency team.</div>
                {(team?.clientTeam || []).length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 10 }}>No teammates added yet.</div>
                  : (team.clientTeam).map((m) => {
                      const lbl = (services.find((x) => x.service_key === m.service)?.service_label) || m.service || "—";
                      return <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "0.5px solid var(--line)", fontSize: 13 }}><span>{m.name} <span style={{ color: "var(--faint)" }}>· {m.email}</span></span><span className="pill p-agency">{lbl}</span></div>;
                    })}
                <form onSubmit={addTeam} style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input className="input" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Full name" />
                    <input className="input" type="email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} placeholder="Company email" />
                  </div>
                  <select className="input" style={{ marginTop: 8 }} value={tSvc} onChange={(e) => setTSvc(e.target.value)}>
                    <option value="">Service they handle…</option>
                    {services.map((x) => <option key={x.service_key} value={x.service_key}>{x.service_label}</option>)}
                  </select>
                  {teamErr && <div className="auth-msg auth-err" style={{ marginTop: 8 }}>{teamErr}</div>}
                  {teamMsg && <div style={{ fontSize: 12, color: "#177E4E", marginTop: 8 }}>{teamMsg}</div>}
                  <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={teamBusy}>{teamBusy ? "Adding…" : "Add teammate"}</button>
                </form>
              </div>

              <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Documents</h3>
              <div className="card" style={{ opacity: 0.75 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Documents</b><span className="pill p-agency">coming soon</span></div>
                <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 6 }}>Your reports, QBRs and shared decks will live here.</div>
              </div>
            </>
          )}
        </>
      )}

      {showFb && (
        <Modal title="Your feedback" onClose={() => setShowFb(false)}>
          {fbDone ? (
            <>
              <div className="auth-msg auth-ok">Thank you! Your feedback has been sent.</div>
              <button className="btn btn-primary" onClick={() => setShowFb(false)}>Done</button>
            </>
          ) : (
            <form onSubmit={sendFeedback}>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>Drag each slider to rate from 1 (lowest) to 10 (highest).</p>
              {services.map((s) => { const v = fbScores[s.service_key] ?? 5; return (
                <div className="field" key={s.service_key}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span>{s.service_label}</span><span style={{ fontWeight: 700, color: "#0B0D12" }}>{v}<span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 400 }}>/10</span></span></label>
                  <input type="range" min={1} max={10} step={1} value={v} onChange={(e) => setFbScores({ ...fbScores, [s.service_key]: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--gold,#F7C948)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)" }}><span>1</span><span>10</span></div>
                </div>
              ); })}
              <div className="field"><label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span>Overall rating</span><span style={{ fontWeight: 700, color: "#0B0D12" }}>{fbOverall || 5}<span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 400 }}>/10</span></span></label>
                <input type="range" min={1} max={10} step={1} value={fbOverall || 5} onChange={(e) => setFbOverall(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--gold,#F7C948)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)" }}><span>1</span><span>10</span></div>
              </div>
              {fbQs.map((q) => (
                <div className="field" key={q.question_key}><label>{q.label}</label>
                  <textarea className="input" rows={3} value={fbAns[q.question_key] || ""} onChange={(e) => setFbAns({ ...fbAns, [q.question_key]: e.target.value })} /></div>
              ))}
              <button className="btn btn-primary" disabled={fbBusy}>{fbBusy ? "Sending…" : "Send feedback"}</button>
            </form>
          )}
        </Modal>
      )}

      {showDetails && (
        <Modal title="Edit client details" onClose={() => setShowDetails(false)}>
          <form onSubmit={saveDetails}>
            <div className="field"><label>Website</label><input className="input" value={dDraft.website} onChange={(e) => setDDraft({ ...dDraft, website: e.target.value })} placeholder="acme.com" /></div>
            <div className="field"><label>Industry</label><input className="input" value={dDraft.industry} onChange={(e) => setDDraft({ ...dDraft, industry: e.target.value })} placeholder="e.g. Fintech" /></div>
            <div className="field"><label>Start date</label><input className="input" type="date" value={dDraft.startDate || ""} onChange={(e) => setDDraft({ ...dDraft, startDate: e.target.value })} /></div>
            <div className="field"><label>Client lead name</label><input className="input" value={dDraft.leadName} onChange={(e) => setDDraft({ ...dDraft, leadName: e.target.value })} placeholder="Full name" /></div>
            <div className="field"><label>Change client lead email (optional)</label><input className="input" type="email" value={dDraft.leadEmail} onChange={(e) => setDDraft({ ...dDraft, leadEmail: e.target.value })} placeholder="leave blank to keep current" /></div>
            {dErr && <div className="auth-msg auth-err">{dErr}</div>}
            <button className="btn btn-primary" disabled={dBusy}>{dBusy ? "Saving…" : "Save details"}</button>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title="Edit onboarding answers" onClose={() => setShowEdit(false)}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>Changes are saved for this client. Either side can update them.</p>
          <form onSubmit={saveAnswers}>
            {flat.map((q) => (
              <div className="field" key={q.key}>
                <label>{q.label}</label>
                {q.type === "textarea"
                  ? <textarea className="input" rows={3} value={draft[q.key] || ""} onChange={(e) => setDraft({ ...draft, [q.key]: e.target.value })} />
                  : <input className="input" value={draft[q.key] || ""} onChange={(e) => setDraft({ ...draft, [q.key]: e.target.value })} />}
              </div>
            ))}
            <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save answers"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
