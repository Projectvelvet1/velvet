"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Shell from "../../../components/Shell";
import AgencyNav from "../../../components/AgencyNav";
import { loadAgencyDepts, DEPARTMENTS } from "../../../lib/agencyNav";
import {
  QUESTION_TYPES, subscribeMaturity, getQuestionnaires, getAssessments, getRoadmaps, band,
  createQuestionnaire, updateQuestionnaire, addSection, addQuestion, moveQuestion, moveSection, removeQuestion,
  sendForApproval, approveQuestionnaire, rejectQuestionnaire, submitAssessment, scoreAssessment, generateRoadmap, updateRoadmapItems, sendRoadmap,
} from "../../../lib/maturity";

const SVC = DEPARTMENTS.flatMap((d) => d.services);
const SVC_LABEL = {}; SVC.forEach((s) => { SVC_LABEL[s.key] = s.label; });
const TYPE_LABEL = {}; QUESTION_TYPES.forEach(([k, l]) => { TYPE_LABEL[k] = l; });
const ST = { draft: { l: "Draft", bg: "#EEF1F4", fg: "#5B6472" }, pending: { l: "Pending approval", bg: "#FDEBD3", fg: "#B4640C" }, approved: { l: "Approved", bg: "#E7F6EF", fg: "#177E4E" }, rejected: { l: "Rejected", bg: "#FBEAE6", fg: "#C0392B" } };

export default function MaturityPipeline() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [, force] = useState(0);
  const [tab, setTab] = useState("build");
  const [serviceSel, setServiceSel] = useState("");
  const [activeQ, setActiveQ] = useState(null);
  const [secTitle, setSecTitle] = useState("");
  const [qText, setQText] = useState({});   // secId -> text
  const [qType, setQType] = useState({});   // secId -> type
  const [rejectNote, setRejectNote] = useState({});
  const [simName, setSimName] = useState("Demo Client");
  const [scoreFor, setScoreFor] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin,home_service").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, !!prof?.is_super_admin));
      const owned = prof?.is_super_admin ? SVC.map((s) => s.key) : (prof?.home_service ? [prof.home_service] : []);
      setServiceSel(owned[0] || "");
      setLoading(false);
    })();
  }, [router]);
  useEffect(() => subscribeMaturity(() => force((n) => n + 1)), []);

  if (loading) return <div className="center">Loading…</div>;
  const isSuper = !!profile?.is_super_admin;
  const owned = isSuper ? SVC.map((s) => s.key) : (profile?.home_service ? [profile.home_service] : []);
  const nav = <AgencyNav profile={profile} active="settings" depts={depts} />;
  const all = getQuestionnaires(), assessments = getAssessments(), roadmaps = getRoadmaps();
  const mine = all.filter((q) => owned.includes(q.service));
  const editing = all.find((q) => q.id === activeQ) || null;
  const pending = all.filter((q) => q.status === "pending");
  const approved = all.filter((q) => q.status === "approved");
  const myAssessments = assessments.filter((a) => owned.includes(a.service));

  const TABS = [["build", "Build"], ...(isSuper ? [["approvals", `Approvals${pending.length ? " (" + pending.length + ")" : ""}`]] : []), ["library", "Approved library"], ["assess", "Assessments"], ["roadmaps", "Roadmaps"]];
  const qOf = (id) => all.find((q) => q.id === id);

  return (
    <Shell profile={profile} roleLabel={isSuper ? "Super admin" : "Team member"} nav={nav}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Maturity questionnaires</h1><span className="pill p-agency">demo · in-memory</span></div>
      <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map(([v, l]) => <button key={v} className="btn" style={{ padding: "6px 12px", fontSize: 13, background: tab === v ? "#fff" : "transparent", boxShadow: tab === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: tab === v ? "var(--text)" : "var(--muted)" }} onClick={() => setTab(v)}>{l}</button>)}
      </div>

      {tab === "build" && (
        <>
          <div className="card">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Service you own:</span>
              <select className="input" style={{ maxWidth: 220 }} value={serviceSel} onChange={(e) => { setServiceSel(e.target.value); setActiveQ(null); }}>
                {owned.map((k) => <option key={k} value={k}>{SVC_LABEL[k] || k}</option>)}
              </select>
              <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => { const q = createQuestionnaire(serviceSel, `${SVC_LABEL[serviceSel]} maturity`); setActiveQ(q.id); }}>+ New questionnaire</button>
            </div>
            <div style={{ marginTop: 10 }}>
              {mine.filter((q) => q.service === serviceSel).length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No questionnaires for this service yet.</div>
                : mine.filter((q) => q.service === serviceSel).map((q) => { const s = ST[q.status]; return (
                  <div key={q.id} onClick={() => setActiveQ(q.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "0.5px solid var(--line)", cursor: "pointer" }}>
                    <div style={{ fontSize: 13 }}>{q.title} <span style={{ color: "var(--faint)" }}>· {q.sections.length} section(s)</span></div>
                    <span className="pill" style={{ background: s.bg, color: s.fg }}>{s.l}</span>
                  </div>); })}
            </div>
          </div>

          {editing && (
            <div className="card">
              <input className="input" style={{ fontWeight: 600 }} value={editing.title} onChange={(e) => updateQuestionnaire(editing.id, { title: e.target.value })} />
              {editing.status === "rejected" && editing.note ? <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>Rejected: {editing.note}</div> : null}
              {editing.sections.map((sec, si) => (
                <div key={sec.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input className="input" value={sec.title} onChange={(e) => { sec.title = e.target.value; updateQuestionnaire(editing.id, {}); }} />
                    <button className="btn btn-ghost" style={{ padding: "6px 9px" }} onClick={() => moveSection(editing.id, si, -1)}>↑</button>
                    <button className="btn btn-ghost" style={{ padding: "6px 9px" }} onClick={() => moveSection(editing.id, si, 1)}>↓</button>
                  </div>
                  {sec.questions.map((qq, qi) => (
                    <div key={qq.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: "0.5px solid var(--line)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>{qq.text}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{TYPE_LABEL[qq.type]}</div></div>
                      <button className="btn btn-ghost" style={{ padding: "5px 8px" }} onClick={() => moveQuestion(editing.id, sec.id, qi, -1)}>↑</button>
                      <button className="btn btn-ghost" style={{ padding: "5px 8px" }} onClick={() => moveQuestion(editing.id, sec.id, qi, 1)}>↓</button>
                      <button className="btn btn-ghost" style={{ padding: "5px 8px", color: "#C0392B" }} onClick={() => removeQuestion(editing.id, sec.id, qq.id)}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input className="input" placeholder="New question" value={qText[sec.id] || ""} onChange={(e) => setQText({ ...qText, [sec.id]: e.target.value })} />
                    <select className="input" style={{ maxWidth: 150 }} value={qType[sec.id] || "scale"} onChange={(e) => setQType({ ...qType, [sec.id]: e.target.value })}>{QUESTION_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    <button className="btn btn-ghost" onClick={() => { if (!(qText[sec.id] || "").trim()) return; addQuestion(editing.id, sec.id, qText[sec.id].trim(), qType[sec.id] || "scale"); setQText({ ...qText, [sec.id]: "" }); }}>Add</button>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input className="input" placeholder="New section title" value={secTitle} onChange={(e) => setSecTitle(e.target.value)} />
                <button className="btn btn-ghost" onClick={() => { addSection(editing.id, secTitle.trim() || "Section"); setSecTitle(""); }}>Add section</button>
              </div>
              {(editing.status === "draft" || editing.status === "rejected") && (
                <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={editing.sections.length === 0} onClick={() => sendForApproval(editing.id)}>Send for approval</button>
              )}
              {editing.status === "pending" && <div style={{ marginTop: 12, fontSize: 13, color: "#B4640C" }}>Waiting on super-admin approval.</div>}
              {editing.status === "approved" && <div style={{ marginTop: 12, fontSize: 13, color: "#177E4E" }}>Approved and in the library.</div>}
            </div>
          )}
        </>
      )}

      {tab === "approvals" && isSuper && (
        <div className="card">
          <b>Approval queue</b>
          {pending.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>Nothing waiting for approval.</div>
            : pending.map((q) => (
              <div key={q.id} style={{ padding: "12px 0", borderTop: "0.5px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><b style={{ fontSize: 14 }}>{q.title}</b><div style={{ fontSize: 12, color: "var(--faint)" }}>{SVC_LABEL[q.service]} · {q.sections.length} section(s), {q.sections.reduce((n, s) => n + s.questions.length, 0)} question(s)</div></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => approveQuestionnaire(q.id)}>Approve</button>
                    <button className="btn btn-ghost" onClick={() => rejectQuestionnaire(q.id, (rejectNote[q.id] || "").trim() || "No reason given")}>Reject</button>
                  </div>
                </div>
                <input className="input" style={{ marginTop: 8 }} placeholder="Rejection note (optional)" value={rejectNote[q.id] || ""} onChange={(e) => setRejectNote({ ...rejectNote, [q.id]: e.target.value })} />
              </div>
            ))}
        </div>
      )}

      {tab === "library" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Approved questionnaires</b><span style={{ fontSize: 12, color: "var(--faint)" }}>auto-sent to every new client</span></div>
          {approved.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No approved questionnaires yet.</div>
            : approved.map((q) => (
              <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "11px 0", borderTop: "0.5px solid var(--line)" }}>
                <div><div style={{ fontSize: 13 }}>{q.title}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{SVC_LABEL[q.service]}</div></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="input" style={{ maxWidth: 150, padding: "7px 10px" }} value={simName} onChange={(e) => setSimName(e.target.value)} />
                  <button className="btn btn-ghost" onClick={() => { const ans = {}; q.sections.forEach((s) => s.questions.forEach((qq) => { ans[qq.id] = "(client answer)"; })); submitAssessment(q.id, "demo", simName || "Demo Client", ans); setTab("assess"); }}>Simulate client assessment</button>
                </div>
              </div>
            ))}
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10 }}>In the live build, approved questionnaires are sent to the client to fill; here "Simulate" stands in for the client so you can test scoring and the roadmap.</div>
        </div>
      )}

      {tab === "assess" && (
        <div className="card">
          <b>Assessments</b>
          {myAssessments.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No submitted assessments yet. Use "Simulate client assessment" in the library.</div>
            : myAssessments.map((a) => { const q = qOf(a.questionnaireId); const roadmap = roadmaps.find((r) => r.assessmentId === a.id); return (
              <div key={a.id} style={{ padding: "12px 0", borderTop: "0.5px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><b style={{ fontSize: 14 }}>{a.clientName}</b><div style={{ fontSize: 12, color: "var(--faint)" }}>{SVC_LABEL[a.service]} · {q ? q.title : "questionnaire"}</div></div>
                  {a.status === "scored"
                    ? <span style={{ textAlign: "right" }}><b style={{ fontSize: 18 }}>{a.areaScore}/100</b> <span className="pill" style={{ background: "#EEF1F4", color: "#5B6472" }}>{a.band}</span></span>
                    : <button className="btn btn-primary" onClick={() => { setScoreFor(scoreFor === a.id ? null : a.id); setScores({}); }}>{scoreFor === a.id ? "Cancel" : "Score answers"}</button>}
                </div>
                {scoreFor === a.id && q && (
                  <div style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                    {q.sections.map((sec) => (
                      <div key={sec.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{sec.title}</div>
                        {sec.questions.map((qq) => (
                          <div key={qq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 0" }}>
                            <div style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{qq.text}</div>
                            <input className="input" type="number" min={0} max={100} style={{ width: 90 }} placeholder="/100" value={scores[qq.id] ?? ""} onChange={(e) => setScores({ ...scores, [qq.id]: e.target.value === "" ? "" : Math.max(0, Math.min(100, +e.target.value)) })} />
                          </div>
                        ))}
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={() => { const clean = {}; Object.keys(scores).forEach((k) => { if (scores[k] !== "" && !isNaN(scores[k])) clean[k] = +scores[k]; }); scoreAssessment(a.id, clean); setScoreFor(null); }}>Save scores</button>
                  </div>
                )}
                {a.status === "scored" && !roadmap && <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => { generateRoadmap(a.id); setTab("roadmaps"); }}>Generate roadmap draft →</button>}
                {roadmap && <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>Roadmap {roadmap.status === "sent" ? "sent to client" : "drafted"} · see Roadmaps tab</div>}
              </div>); })}
        </div>
      )}

      {tab === "roadmaps" && (
        <div className="card">
          <b>Roadmaps</b>
          {roadmaps.filter((r) => owned.includes(r.service)).length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No roadmaps yet. Score an assessment, then generate a draft.</div>
            : roadmaps.filter((r) => owned.includes(r.service)).map((r) => (
              <div key={r.id} style={{ padding: "12px 0", borderTop: "0.5px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><b style={{ fontSize: 14 }}>{r.clientName}</b><div style={{ fontSize: 12, color: "var(--faint)" }}>{SVC_LABEL[r.service]}</div></div>
                  <span className="pill" style={{ background: r.status === "sent" ? "#E7F6EF" : "#EEF1F4", color: r.status === "sent" ? "#177E4E" : "#5B6472" }}>{r.status === "sent" ? "Sent to client" : "Draft"}</span>
                </div>
                {r.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
                    <input className="input" value={it.text} disabled={r.status === "sent"} onChange={(e) => { const items = r.items.map((x, j) => j === i ? { text: e.target.value } : x); updateRoadmapItems(r.id, items); }} />
                    {r.status !== "sent" && <button className="btn btn-ghost" style={{ padding: "6px 9px", color: "#C0392B" }} onClick={() => updateRoadmapItems(r.id, r.items.filter((_, j) => j !== i))}>✕</button>}
                  </div>
                ))}
                {r.status !== "sent" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn-ghost" onClick={() => updateRoadmapItems(r.id, [...r.items, { text: "New step" }])}>+ Add step</button>
                    <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => sendRoadmap(r.id)}>Send to client</button>
                  </div>
                )}
              </div>
            ))}
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10 }}>Nothing reaches the client until you press "Send to client".</div>
        </div>
      )}
    </Shell>
  );
}
