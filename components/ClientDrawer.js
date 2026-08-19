"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadQuestions } from "../lib/onboardingQuestions";
import Modal from "./Modal";
import { notify } from "../lib/notify";

// Props: client (rich), onClose()
// Real data: onboarding answers, feedback trend, services, team, health.
// In-memory (tagged) until tables exist: quarterly goals, action plans, roadmap, maturity.
const HEALTH = { healthy: { l: "Healthy", bg: "#E4F6EC", fg: "#177E4E" }, watch: { l: "To watch", bg: "#FDEBD3", fg: "#B4640C" }, risk: { l: "At risk", bg: "#FBEAE6", fg: "#C0392B" }, held: { l: "Held", bg: "#EEF1F4", fg: "#5B6472" } };
const DEPT_COLOR = { Performance: "#C0392B", Content: "#7C3AED", Analytics: "#1E7F5C" };
const RM = { draft: { l: "Draft", bg: "#EEF1F4", fg: "#5B6472" }, in_review: { l: "In review", bg: "#FDEBD3", fg: "#B4640C" }, approved: { l: "Approved", bg: "#E4F6EC", fg: "#177E4E" }, sent: { l: "Sent", bg: "#E7F0FF", fg: "#2557C7" } };
const initials = (n) => (n || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
const YEARS = Array.from({ length: 10 }, (_, i) => 2026 + i);
const QS = ["Q1", "Q2", "Q3", "Q4"];
const TABS = ["Snapshot", "Action plans", "Onboarding", "Services", "Team", "Roadmap", "Feedback", "Maturity"];

function band(score) { if (score == null) return null; if (score < 41) return { l: "Foundational", fg: "#B4640C" }; if (score <= 70) return { l: "Developing", fg: "#2557C7" }; return { l: "Mature", fg: "#177E4E" }; }

function Trend({ points }) {
  if (!points || points.length < 2) return <div style={{ fontSize: 12, color: "var(--faint)" }}>Not enough data for a trend yet.</div>;
  const w = 520, h = 120, pad = 10;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
  const min = Math.min(...points), max = Math.max(...points, min + 1);
  const ys = points.map((v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 120 }}>
      <path d={d} fill="none" stroke="#2557C7" strokeWidth="2.5" />
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="3" fill="#2557C7" />)}
    </svg>
  );
}

export default function ClientDrawer({ client, onClose, canManage = false }) {
  const [tab, setTab] = useState("Snapshot");
  const [answers, setAnswers] = useState(null);   // [{label, answer}]
  const [fbSeries, setFbSeries] = useState(null);  // numbers
  const [fbComments, setFbComments] = useState([]);
  const [openPlan, setOpenPlan] = useState(null);  // plan index for detail modal
  const [itemForm, setItemForm] = useState({ service: "", text: "" });
  const [shared, setShared] = useState(false);
  // in-memory demo state
  const [goals, setGoals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [showGoal, setShowGoal] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [gForm, setGForm] = useState({ text: "", q: "Q1", y: 2026, target: "", progress: 0 });
  const [pForm, setPForm] = useState({ title: "", owner: "", due: "", q: "Q1", y: 2026 });
  const [rForm, setRForm] = useState({ item: "", owner: "", status: "draft", q: "Q1", y: 2026 });

  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("modal-open"); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // onboarding answers (real) + question labels
      try {
        const { data: resp } = await supabase.from("onboarding_responses").select("question_key,answer").eq("workspace_id", client.id);
        const map = {}; (resp || []).forEach((r) => { map[r.question_key] = r.answer; });
        let flat = [];
        try {
          const q = await loadQuestions();
          const arr = Array.isArray(q) ? q : [];
          if (arr.length && (arr[0].fields || arr[0].questions)) {
            arr.forEach((s) => (s.fields || s.questions || []).forEach((f) => flat.push({ key: f.key, label: f.label || f.key })));
          } else {
            flat = arr.map((f) => ({ key: f.key, label: f.label || f.key }));
          }
        } catch { /* fall back to raw keys */ }
        if (!flat.length) flat = Object.keys(map).map((k) => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
        const rows = flat.map((f) => ({ label: f.label, answer: (map[f.key] || "").toString().trim() }));
        if (alive) setAnswers(rows);
      } catch { if (alive) setAnswers([]); }
      // feedback trend (real)
      try {
        const { data: subs } = await supabase.from("feedback_submissions").select("overall_score,created_at,comment").eq("workspace_id", client.id).order("created_at", { ascending: true });
        const series = (subs || []).map((s) => s.overall_score).filter((v) => v != null);
        if (alive) { setFbSeries(series); setFbComments((subs || []).filter((s) => s.comment).slice(-4).reverse().map((s) => ({ c: s.comment, d: s.created_at }))); }
      } catch { if (alive) setFbSeries([]); }
    })();
    return () => { alive = false; };
  }, [client.id]);

  const h = HEALTH[client.health] || HEALTH.healthy;
  const services = client.services || [];
  const team = client.team || [];
  const fbLatest = fbSeries && fbSeries.length ? fbSeries[fbSeries.length - 1] : (client.feedback?.overall ?? null);
  const fbDelta = fbSeries && fbSeries.length >= 2 ? (fbSeries[fbSeries.length - 1] - fbSeries[fbSeries.length - 2]) : null;

  // demo maturity areas (tagged)
  const maturity = [
    { area: "Tracking & tagging", note: "Event coverage and naming consistency.", score: 62 },
    { area: "Data hygiene", note: "Duplicates, spam filtering, attribution windows.", score: 38 },
    { area: "Reporting readiness", note: "Dashboards, definitions, single source of truth.", score: null },
  ];
  const STEPS = ["Questionnaire", "Answered", "AI assessed", "Agency set", "Roadmap draft", "Sent to client"];

  const svcByDept = {};
  services.forEach((s) => { /* services are labels; group loosely */ });

  const tile = (label, val) => (
    <div style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, color: "var(--faint)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{val}</div>
    </div>
  );

  return (
    <div className="drawer-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" role="dialog" aria-label={`${client.name}`}>
        <div className="drawer-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ fontSize: 18 }}>{client.name}</b>
              <span className="pill" style={{ background: h.bg, color: h.fg }}>{h.l}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>
              {[client.industry, client.phase === "prospect" ? "Discovery" : "Signed", client.lead_name ? "Lead: " + client.lead_name : "Unassigned lead"].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-tabs">
          {TABS.map((t) => <button key={t} className={"drawer-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>)}
        </div>

        <div className="drawer-body">
          {tab === "Snapshot" && (
            <>
              <div style={{ background: "var(--ink,#0B0D12)", color: "#fff", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#9AA3B2", textTransform: "uppercase", letterSpacing: .4 }}>North star</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{client.kpi_label ? `${client.kpi_value || "—"} ${client.kpi_label}` : (client.kpi_value || "Set a headline metric for this client")}</div>
                {client.kpi_caption ? <div style={{ fontSize: 12, color: "#C7CDD8", marginTop: 2 }}>{client.kpi_caption}</div> : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
                {tile("Services", services.length)}
                {tile("Team", team.reduce((n, d) => n + (d.members?.length || 0), 0))}
                {tile("Feedback", fbLatest != null ? `${fbLatest}/10` : "—")}
                {tile("Health", h.l)}
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>Quarterly goals</b>
                  <button className="btn btn-ghost" onClick={() => setShowGoal(!showGoal)}>{showGoal ? "Cancel" : "+ Add goal"}</button>
                </div>
                {showGoal && (
                  <div style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                    <input className="input" placeholder="Goal" value={gForm.text} onChange={(e) => setGForm({ ...gForm, text: e.target.value })} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <select className="input" value={gForm.q} onChange={(e) => setGForm({ ...gForm, q: e.target.value })}>{QS.map((q) => <option key={q}>{q}</option>)}</select>
                      <select className="input" value={gForm.y} onChange={(e) => setGForm({ ...gForm, y: +e.target.value })}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input className="input" placeholder="Target" value={gForm.target} onChange={(e) => setGForm({ ...gForm, target: e.target.value })} />
                      <input className="input" type="number" min={0} max={100} placeholder="Progress %" value={gForm.progress} onChange={(e) => setGForm({ ...gForm, progress: +e.target.value })} />
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => { if (!gForm.text.trim()) return; setGoals([...goals, gForm]); setGForm({ text: "", q: "Q1", y: 2026, target: "", progress: 0 }); setShowGoal(false); }}>Save goal</button>
                  </div>
                )}
                {goals.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No goals yet.</div>
                  : goals.map((g, i) => (
                    <div key={i} style={{ padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{g.q} {g.y} — {g.text}</span><span style={{ color: "var(--faint)" }}>{g.progress}%</span></div>
                      <div className="ubar" style={{ marginTop: 6 }}><span style={{ width: `${Math.min(100, g.progress)}%` }} /></div>
                      {g.target ? <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>Target: {g.target}</div> : null}
                    </div>
                  ))}
              </div>
            </>
          )}

          {tab === "Action plans" && (
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Action plans</b>
                <button className="btn btn-ghost" onClick={() => setShowPlan(!showPlan)}>{showPlan ? "Cancel" : "+ Add action plan"}</button>
              </div>
              {showPlan && (
                <div style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                  <input className="input" placeholder="Title" value={pForm.title} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input className="input" placeholder="Owner" value={pForm.owner} onChange={(e) => setPForm({ ...pForm, owner: e.target.value })} />
                    <input className="input" type="date" value={pForm.due} onChange={(e) => setPForm({ ...pForm, due: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <select className="input" value={pForm.q} onChange={(e) => setPForm({ ...pForm, q: e.target.value })}>{QS.map((q) => <option key={q}>{q}</option>)}</select>
                    <select className="input" value={pForm.y} onChange={(e) => setPForm({ ...pForm, y: +e.target.value })}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => { if (!pForm.title.trim()) return; setPlans([...plans, { ...pForm, items: [] }]); setPForm({ title: "", owner: "", due: "", q: "Q1", y: 2026 }); setShowPlan(false); }}>Save</button>
                </div>
              )}
              {plans.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No action plans yet.</div>
                : plans.map((p, i) => (
                  <div key={i} onClick={() => { setItemForm({ service: (client.services || [])[0] || "", text: "" }); setOpenPlan(i); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: "0.5px solid var(--line)", cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.q} {p.y}<span style={{ color: "var(--faint)", fontWeight: 400 }}> · {p.title}</span></div>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 11, color: "var(--faint)" }}>{(p.items || []).length} item{(p.items || []).length === 1 ? "" : "s"}</span><span style={{ color: "var(--faint)" }}>›</span></span>
                  </div>
                ))}
            </div>
          )}

          {tab === "Onboarding" && (
            <div className="card" style={{ margin: 0 }}>
              {answers === null ? <div style={{ fontSize: 13, color: "var(--faint)" }}>Loading answers…</div>
                : answers.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No onboarding form found for this client.</div>
                  : <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{answers.filter((a) => a.answer).length} of {answers.length} answered</div>
                      {canManage && (shared
                        ? <span className="pill" style={{ background: "#E7F6EF", color: "#177E4E" }}>Shared with team</span>
                        : <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => { setShared(true); notify({ type: "onboarding_shared", text: `Onboarding shared with ${client.name}'s team`, meta: { client: client.id } }); }}>Share with team</button>)}
                    </div>
                    {answers.map((a, i) => (
                      <div key={i} style={{ padding: "10px 0", borderTop: i ? "0.5px solid var(--line)" : "none" }}>
                        <div style={{ fontSize: 12, color: "var(--faint)" }}>{a.label}</div>
                        {a.answer ? <div style={{ fontSize: 14, marginTop: 2 }}>{a.answer}</div>
                          : <div style={{ fontSize: 13, marginTop: 2, fontStyle: "italic", color: "#B4640C" }}>Not answered yet</div>}
                      </div>
                    ))}
                  </>}
            </div>
          )}

          {tab === "Services" && (
            <div className="card" style={{ margin: 0 }}>
              <b>Purchased services</b>
              {services.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 8 }}>No services yet.</div>
                : <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{services.map((s) => <span key={s} className="pill p-agency">{s}</span>)}</div>}
            </div>
          )}

          {tab === "Team" && (
            <div className="card" style={{ margin: 0 }}>
              <b>Account team</b>
              {team.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 8 }}>No one assigned yet.</div>
                : team.map((d) => (
                  <div key={d.dept} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: DEPT_COLOR[d.dept] || "var(--text)", marginBottom: 6 }}>{d.dept}</div>
                    {(d.members || []).map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                        <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(m)}</span>
                        <div style={{ fontSize: 13 }}>{m}</div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {tab === "Roadmap" && (
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Roadmap</b>
                <button className="btn btn-ghost" onClick={() => setShowItem(!showItem)}>{showItem ? "Cancel" : "+ Add item"}</button>
              </div>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>What is planned, by quarter. Shared with the client when approved.</div>
              {showItem && (
                <div style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                  <input className="input" placeholder="Item" value={rForm.item} onChange={(e) => setRForm({ ...rForm, item: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input className="input" placeholder="Owner" value={rForm.owner} onChange={(e) => setRForm({ ...rForm, owner: e.target.value })} />
                    <select className="input" value={rForm.status} onChange={(e) => setRForm({ ...rForm, status: e.target.value })}>{Object.keys(RM).map((k) => <option key={k} value={k}>{RM[k].l}</option>)}</select>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <select className="input" value={rForm.q} onChange={(e) => setRForm({ ...rForm, q: e.target.value })}>{QS.map((q) => <option key={q}>{q}</option>)}</select>
                    <select className="input" value={rForm.y} onChange={(e) => setRForm({ ...rForm, y: +e.target.value })}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => { if (!rForm.item.trim()) return; setRoadmap([...roadmap, rForm]); setRForm({ item: "", owner: "", status: "draft", q: "Q1", y: 2026 }); setShowItem(false); }}>Save</button>
                </div>
              )}
              {roadmap.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>No roadmap items yet.</div>
                : roadmap.map((r, i) => { const st = RM[r.status] || RM.draft; return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                    <div><div style={{ fontSize: 13 }}>{r.q} {r.y} — {r.item}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{r.owner || "Unassigned"}</div></div>
                    <span className="pill" style={{ background: st.bg, color: st.fg }}>{st.l}</span>
                  </div>); })}
            </div>
          )}

          {tab === "Feedback" && (
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 30, fontWeight: 800 }}>{fbLatest != null ? fbLatest : "—"}</span>
                <span style={{ fontSize: 12, color: "var(--faint)" }}>/10 latest</span>
                {fbDelta != null ? <span style={{ fontSize: 12, color: fbDelta >= 0 ? "#177E4E" : "#C0392B" }}>{fbDelta >= 0 ? "▲" : "▼"} {Math.abs(fbDelta)}</span> : null}
              </div>
              <div style={{ marginTop: 12 }}><Trend points={fbSeries && fbSeries.length ? fbSeries : null} /></div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "10px 0 6px" }}>Recent comments</div>
              {fbComments.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No comments yet.</div>
                : fbComments.map((c, i) => <div key={i} style={{ padding: "8px 0", borderTop: "0.5px solid var(--line)", fontSize: 13 }}>{c.c}<div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{new Date(c.d).toLocaleDateString()}</div></div>)}
            </div>
          )}

          {tab === "Maturity" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Data-health maturity per area</div>
                <span className="pill p-agency">demo · scoring to be defined</span>
              </div>
              {maturity.map((m, i) => { const b = band(m.score); return (
                <div className="card" key={i} style={{ margin: "0 0 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div><b style={{ fontSize: 14 }}>{m.area}</b><div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{m.note}</div></div>
                    {m.score != null
                      ? <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800 }}>{m.score}<span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 400 }}>/100</span></div><div style={{ fontSize: 11, color: b.fg }}>{b.l}</div></div>
                      : <span className="pill" style={{ background: "#FDEBD3", color: "#B4640C" }}>In assessment</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "12px 0" }}>
                    {STEPS.map((s, si) => (
                      <span key={si} style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 20, background: si <= (m.score != null ? 3 : 1) ? "#E4F6EC" : "#EEF1F4", color: si <= (m.score != null ? 3 : 1) ? "#177E4E" : "#5B6472" }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 12px" }}>Review assessment</button>
                    <button className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 12px" }}>Edit roadmap draft</button>
                  </div>
                </div>); })}
            </>
          )}
        </div>
      </div>

      {openPlan !== null && plans[openPlan] && (() => {
        const p = plans[openPlan];
        const svcList = client.services || [];
        const grouped = {}; svcList.forEach((s) => { grouped[s] = (p.items || []).filter((it) => it.service === s); });
        const ungrouped = (p.items || []).filter((it) => !svcList.includes(it.service));
        const addItem = () => { if (!itemForm.text.trim()) return; const next = plans.map((x, i) => i === openPlan ? { ...x, items: [...(x.items || []), { service: itemForm.service || (svcList[0] || "General"), text: itemForm.text.trim() }] } : x); setPlans(next); setItemForm({ service: itemForm.service, text: "" }); };
        return (
          <Modal title={`${p.q} ${p.y} — ${p.title}`} onClose={() => setOpenPlan(null)}>
            <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 12 }}>{[p.owner, p.due ? "due " + p.due : null].filter(Boolean).join(" · ") || "Action plan"}</div>
            {svcList.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>This client has no purchased services to group by.</div>
              : svcList.map((s) => (
                <div key={s} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}><span className="pill p-agency">{s}</span></div>
                  {grouped[s].length === 0 ? <div style={{ fontSize: 12, color: "var(--faint)" }}>No items yet.</div>
                    : grouped[s].map((it, i) => <div key={i} style={{ fontSize: 13, padding: "6px 0", borderTop: "0.5px solid var(--line)" }}>{it.text}</div>)}
                </div>
              ))}
            {ungrouped.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Other</div>{ungrouped.map((it, i) => <div key={i} style={{ fontSize: 13, padding: "6px 0", borderTop: "0.5px solid var(--line)" }}>{it.text}</div>)}</div>}
            <div style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Add item</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="input" style={{ maxWidth: 180 }} value={itemForm.service} onChange={(e) => setItemForm({ ...itemForm, service: e.target.value })}>
                  {(svcList.length ? svcList : ["General"]).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="input" placeholder="What will be done" value={itemForm.text} onChange={(e) => setItemForm({ ...itemForm, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} />
              </div>
              <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={addItem}>Add</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
