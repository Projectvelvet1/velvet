"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "./Shell";
import Modal from "./Modal";
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
  const [cvAgency, setCvAgency] = useState([]);
  const [cvClient, setCvClient] = useState([]);
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
    const { data: everyone } = await supabase.from("profiles").select("id,full_name,email,home_department").eq("side", "agency");
    setAllTeam(everyone || []);
    const nameOf = (id) => { const pr = (everyone || []).find((x) => x.id === id); return pr ? (pr.full_name || pr.email) : "Unknown"; };
    const { data: asg } = await supabase.from("service_assignments").select("service_key,profile_id").eq("workspace_id", workspace.id);
    const map = {}; (asg || []).forEach((a) => { (map[a.service_key] ||= []).push({ id: a.profile_id, name: nameOf(a.profile_id) }); });
    setSvcPeople(map);
  }
  useEffect(() => { if (viewingAs && workspace?.id) loadAssignments(); }, [viewingAs, workspace?.id]);
  useEffect(() => {
    (async () => {
      if (viewingAs || !workspace?.id) return; // client's own portal only
      const { data: { user } } = await supabase.auth.getUser();
      setMeId(user?.id || null);
      const { data: mem } = await supabase.from("memberships").select("profile_id").eq("workspace_id", workspace.id);
      const ids = [...new Set((mem || []).map((m) => m.profile_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,email,side").in("id", ids) : { data: [] };
      setCvAgency((profs || []).filter((x) => x.side === "agency").map((x) => ({ id: x.id, name: x.full_name || x.email })));
      setCvClient((profs || []).filter((x) => x.side === "client").map((x) => ({ id: x.id, name: x.full_name || x.email })));
    })();
  }, [viewingAs, workspace?.id]);

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

  function openFb() { setFbScores({}); setFbOverall(0); setFbAns({}); setFbDone(false); setShowFb(true); }
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
        <a style={{ opacity: onboarded ? 1 : .4, cursor: onboarded ? "pointer" : "default" }}>Team</a>
      </nav>
      {Object.keys(grouped).map((dep) => (
        <div key={dep}>
          <div className="grp">{DEPT_LABEL[dep] || dep}</div>
          <nav className="nav">
            {grouped[dep].map((s) => (
              <a key={s.service_key} className={"svc-menu svc svc-" + s.service_key} style={{ opacity: onboarded ? 1 : .4, cursor: onboarded ? "pointer" : "default" }}><span className="svc-dot" />{s.service_label}</a>
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
                    const eligible = allTeam.filter((t) => t.home_department === SVC_DEP[s.service_key] && !assignedIds.has(t.id));
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
            {viewingAs && <button className="btn btn-ghost" onClick={() => router.push(`/questions?phase=${answersPhase}`)}>Edit questions</button>}
            <button className="btn btn-ghost" onClick={openEdit}>{hasAny ? "Edit answers" : "Fill in answers"}</button>
          </div>
        )}
      </div>
      {!answersOpen ? null : flat.length === 0 ? (
        <div className="empty">No questions have been set up yet.{viewingAs ? " Use “Edit questions” to add them." : ""}</div>
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
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>{viewingAs ? wsLocal.name : `Welcome, ${firstName}`}</h1>
        <span className="pill p-client">{isProspect ? "Discovery" : "Client"}</span>
      </div>

      {!viewingAs && !isProspect && (
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
      ) : (
        <>
          <div className="card"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><b>{workspace.name}</b><p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Dashboards are ready.</p></div>{!viewingAs && <button className="btn btn-primary" onClick={() => setShowAssign(true)}>Assign a task</button>}</div></div>
          {answersSection}
          {viewingAs ? deptDrilldown : (
            <>
              <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Your services</h3>
              {services.map((s) => (
                <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key} style={{ cursor: "pointer" }} onClick={() => router.push(`/client/${workspace.id}/service/${s.service_key}`)}>
                  <b>{s.service_label}</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{DEPT_LABEL[s.department]}</div>
                </div>
              ))}
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
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>Rate each service from 1 (lowest) to 10 (highest).</p>
              {services.map((s) => (
                <div className="field" key={s.service_key}>
                  <label>{s.service_label}</label>
                  <select className="input" value={fbScores[s.service_key] || ""} onChange={(e) => setFbScores({ ...fbScores, [s.service_key]: Number(e.target.value) })} required>
                    <option value="">Choose 1–10…</option>
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
              <div className="field"><label>Overall rating</label>
                <select className="input" value={fbOverall || ""} onChange={(e) => setFbOverall(Number(e.target.value))} required>
                  <option value="">Choose 1–10…</option>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
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
