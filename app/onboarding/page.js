"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { INTAKE_STEPS } from "../../lib/onboardingQuestions";

const NAVY = "#0B0D12", GOLD = "#F7C948", LINE = "#2A3550", MUT = "#9AA3B2", CARD = "#15181F";

export default function Onboarding() {
  const router = useRouter();
  const [ws, setWs] = useState(null);
  const [phase, setPhase] = useState("full");
  const [asAgency, setAsAgency] = useState(false);
  const [answers, setAnswers] = useState({});
  const [sections, setSections] = useState(INTAKE_STEPS);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const url = new URL(window.location.href);
      const wsId = url.searchParams.get("ws");
      const { data: prof } = await supabase.from("profiles").select("side").eq("id", session.user.id).single();
      setAsAgency(prof?.side === "agency");
      let wk = null;
      if (wsId) { const { data } = await supabase.from("workspaces").select("id,name,phase").eq("id", wsId).single(); wk = data; }
      else { const { data } = await supabase.from("workspaces").select("id,name,phase").limit(1); wk = (data || [])[0]; }
      if (!wk) { setLoading(false); return; }
      setWs(wk);
      const ph = wk.phase === "prospect" ? "discovery" : "full"; setPhase(ph);
      let form = INTAKE_STEPS;
      try {
        const { data: sess } = await supabase.auth.getSession();
        const fr = await fetch(`/api/onboarding-form?workspaceId=${wk.id}`, { headers: { Authorization: `Bearer ${sess.session?.access_token}` } });
        const fj = await fr.json(); if (fj.ok && Array.isArray(fj.definition) && fj.definition.length) form = fj.definition;
      } catch {}
      setSections(form);
      const { data: resp } = await supabase.from("onboarding_responses").select("question_key,answer").eq("workspace_id", wk.id).eq("phase", ph);
      const a = {}; (resp || []).forEach((r) => { a[r.question_key] = r.answer; });
      form.forEach((s) => s.questions.forEach((q) => { if (q.type === "multiselect" && a[q.key]) a[q.key] = String(a[q.key]).split(", ").filter(Boolean); }));
      setAnswers(a); setLoading(false);
    })();
  }, [router]);

  const cur = sections[step];
  const isLast = step === sections.length - 1;
  const set = (k, v) => setAnswers((p) => ({ ...p, [k]: v }));
  const toggleMulti = (k, opt) => setAnswers((p) => { const arr = Array.isArray(p[k]) ? p[k] : []; return { ...p, [k]: arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt] }; });

  async function submit() {
    // require the SLA acknowledgment
    const ackQ = sections.flatMap((s) => s.questions).find((q) => q.type === "ack");
    if (ackQ && answers[ackQ.key] !== "Acknowledged") { setErr("Please tick the acknowledgment to finish."); return; }
    setBusy(true); setErr("");
    const map = {};
    sections.forEach((s) => s.questions.forEach((q) => {
      if (q.type === "contact") q.fields.forEach(([sub]) => { map[`${q.key}_${sub}`] = answers[`${q.key}_${sub}`] || ""; });
      else if (q.type === "multiselect") map[q.key] = Array.isArray(answers[q.key]) ? answers[q.key].join(", ") : "";
      else map[q.key] = answers[q.key] || "";
    }));
    const { data: sess } = await supabase.auth.getSession();
    const tok = sess.session?.access_token;
    const saveRes = await fetch("/api/onboarding-save", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify({ workspaceId: ws.id, phase, answers: map }) });
    if (!saveRes.ok) { const j = await saveRes.json().catch(() => ({})); setBusy(false); setErr(j.error || "Could not save your answers. Please try again."); return; }
    await fetch("/api/onboarding-complete", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify({ workspaceId: ws.id, phase }) });
    setBusy(false); setDone(true);
  }

  if (loading) return <div className="center">Loading…</div>;
  if (!ws) return <div className="center">No workspace found to onboard.</div>;

  const wrap = { minHeight: "100vh", background: "#F5F6F8", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" };
  const card = { width: "100%", maxWidth: 640, background: NAVY, borderRadius: 18, padding: 26, color: "#fff", fontFamily: "Outfit, sans-serif" };

  if (done) return (
    <div style={wrap}><div style={card}>
      <div style={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>Welcome Tomorrow</div>
      <h1 style={{ fontSize: 24, margin: "14px 0 8px" }}>All done. Thank you.</h1>
      <p style={{ color: MUT, fontSize: 14 }}>{asAgency ? "Answers saved for this client." : "We've received your answers. Your Welcome Tomorrow team will be in touch before the kickoff call."}</p>
      <button onClick={() => router.push("/dashboard")} style={{ marginTop: 18, background: GOLD, color: NAVY, border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Go to dashboard</button>
    </div></div>
  );

  return (
    <div style={wrap}><div style={card}>
      <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 4 }}>Welcome Tomorrow · Pre-Kickoff Intake</div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0 6px" }}>
        {sections.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 20, background: i <= step ? GOLD : LINE }} />)}
      </div>
      <div style={{ fontSize: 12, color: MUT, marginBottom: 18 }}>Step {step + 1} of {sections.length} · {cur.title}</div>

      {cur.subtitle && <div style={{ fontSize: 13, color: MUT, marginBottom: 16 }}>{cur.subtitle}</div>}

      {cur.questions.map((q) => (
        <div key={q.key} style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 7 }}>{q.label}</label>
          {q.helper && <div style={{ fontSize: 12, color: MUT, marginTop: -3, marginBottom: 7 }}>{q.helper}</div>}

          {q.type === "textarea" ? (
            <textarea value={answers[q.key] || ""} onChange={(e) => set(q.key, e.target.value)} rows={3} style={inp} placeholder="Your answer" />
          ) : q.type === "select" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt) => { const on = answers[q.key] === opt; return (
                <div key={opt} onClick={() => set(q.key, opt)} style={{ ...optRow, borderColor: on ? GOLD : LINE, background: on ? "rgba(247,201,72,.12)" : CARD }}>
                  <span style={{ color: on ? GOLD : MUT }}>{on ? "●" : "○"}</span><span>{opt}</span>
                </div>
              ); })}
            </div>
          ) : q.type === "multiselect" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {q.options.map((opt) => { const on = Array.isArray(answers[q.key]) && answers[q.key].includes(opt); return (
                <div key={opt} onClick={() => toggleMulti(q.key, opt)} style={{ ...pill, borderColor: on ? GOLD : LINE, background: on ? GOLD : "transparent", color: on ? NAVY : "#E7EAF0", fontWeight: on ? 600 : 400 }}>{opt}</div>
              ); })}
            </div>
          ) : q.type === "contact" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {q.fields.map(([sub, subLabel]) => <input key={sub} value={answers[`${q.key}_${sub}`] || ""} onChange={(e) => set(`${q.key}_${sub}`, e.target.value)} style={inp} placeholder={subLabel} />)}
            </div>
          ) : q.type === "ack" ? (
            <div onClick={() => set(q.key, answers[q.key] === "Acknowledged" ? "" : "Acknowledged")} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: `1px solid ${answers[q.key] === "Acknowledged" ? GOLD : LINE}`, background: answers[q.key] === "Acknowledged" ? "rgba(247,201,72,.12)" : CARD, borderRadius: 10, padding: 12, cursor: "pointer" }}>
              <span style={{ color: GOLD, fontSize: 16 }}>{answers[q.key] === "Acknowledged" ? "☑" : "☐"}</span>
              <span style={{ fontSize: 13, color: "#E7EAF0" }}>{q.ackText} <span style={{ color: "#F2B4A3" }}>Required</span></span>
            </div>
          ) : (
            <input value={answers[q.key] || ""} onChange={(e) => set(q.key, e.target.value)} style={inp} placeholder={q.type === "url" ? "https://…" : "Your answer"} />
          )}
        </div>
      ))}

      {err && <div style={{ fontSize: 13, color: "#F2B4A3", margin: "6px 0 10px" }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `0.5px solid ${LINE}`, paddingTop: 16, marginTop: 6 }}>
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ background: "transparent", color: step === 0 ? LINE : MUT, border: "none", fontSize: 14, cursor: step === 0 ? "default" : "pointer" }}>← Back</button>
        {isLast
          ? <button onClick={submit} disabled={busy} style={goldBtn}>{busy ? "Submitting…" : "Submit"}</button>
          : <button onClick={() => setStep((s) => Math.min(sections.length - 1, s + 1))} style={goldBtn}>Next →</button>}
      </div>
    </div></div>
  );
}

const inp = { width: "100%", background: CARD, border: "0.5px solid #2A3550", borderRadius: 10, padding: "11px 13px", color: "#fff", fontSize: 14, fontFamily: "Outfit, sans-serif", boxSizing: "border-box" };
const optRow = { display: "flex", gap: 10, alignItems: "center", border: "1px solid #2A3550", borderRadius: 10, padding: "11px 13px", fontSize: 13, color: "#E7EAF0", cursor: "pointer" };
const pill = { border: "0.5px solid #2A3550", borderRadius: 20, padding: "8px 14px", fontSize: 13, cursor: "pointer" };
const goldBtn = { background: "#F7C948", color: "#0B0D12", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
