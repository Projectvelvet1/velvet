"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { DISCOVERY_STEPS } from "../../lib/onboardingQuestions";
const STEPS = DISCOVERY_STEPS;


export const dynamic = "force-dynamic";

function OnboardingInner() {
  const router = useRouter();
  const search = useSearchParams();
  const wsParam = search.get("ws");
  const [asAgency, setAsAgency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      let wk = null;
      if (wsParam) {
        // agency acting on a client's behalf: authorise via server, then load
        const res = await fetch(`/api/client-context?id=${wsParam}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { const j = await res.json(); wk = j.workspace; setAsAgency(true); }
      } else {
        const { data: w } = await supabase.from("workspaces").select("id,name,phase,discovery_complete").limit(1);
        wk = w?.[0] || null;
      }
      setWs(wk);
      if (wk) {
        const { data: resp } = await supabase.from("onboarding_responses").select("question_key,answer").eq("workspace_id", wk.id).eq("phase", "discovery");
        const a = {}; (resp || []).forEach((r) => (a[r.question_key] = r.answer));
        setAnswers(a);
        if (wk.discovery_complete) setDone(true);
      }
      setLoading(false);
    })();
  }, [router]);

  const cur = STEPS[step];
  const totalQ = STEPS.reduce((n, s) => n + s.questions.length, 0);
  const filled = Object.values(answers).filter((v) => (v || "").trim()).length;
  const pct = Math.round((filled / totalQ) * 100);
  const stepComplete = cur.questions.every((q) => (answers[q.key] || "").trim());

  async function saveStep() {
    if (!ws) return;
    const rows = cur.questions.map((q) => ({ workspace_id: ws.id, phase: "discovery", question_key: q.key, answer: answers[q.key] || "", updated_at: new Date().toISOString() }));
    await supabase.from("onboarding_responses").upsert(rows, { onConflict: "workspace_id,phase,question_key" });
  }
  async function next() { await saveStep(); if (step < STEPS.length - 1) setStep(step + 1); }
  async function submit() {
    setBusy(true); await saveStep();
    const { data } = await supabase.auth.getSession();
    await fetch("/api/onboarding-complete", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ workspaceId: ws.id, phase: "discovery" }) });
    setBusy(false); setDone(true);
  }

  if (loading) return <div className="center">Loading…</div>;

  if (done) return (
    <div className="auth-wrap" style={{ alignItems: "center" }}>
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-logo"><span className="tile"><img src="/mark.png" alt="" /></span></div>
        <h1>Thank you 🙌</h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>We've received your answers. Your Welcome Tomorrow team will be in touch shortly.</p>
        <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => router.replace("/dashboard")}>Back to your space</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--cloud)", padding: "0 0 60px" }}>
      <div style={{ background: "var(--ink)", backgroundImage: "var(--grid)", color: "#fff", padding: "22px 0" }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tile" style={{ width: 34, height: 34, borderRadius: 9 }}><img src="/mark.png" alt="" style={{ width: 22 }} /></span>
            <b>Welcome Tomorrow</b>
          </div>
          <h1 style={{ fontSize: 26, marginTop: 14 }}>Let's get to know your business</h1>
          <p style={{ color: "var(--on-dark-mut)", fontSize: 14 }}>A few quick questions so we can help you best.</p>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 720, marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          <span>Step {step + 1} of {STEPS.length}</span><span>{pct}% complete</span>
        </div>
        <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: "100%", width: pct + "%", background: "var(--gold)" }} />
        </div>

        <div className="card">
          <h3 style={{ fontSize: 18 }}>{cur.title}</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{cur.subtitle}</p>
          {cur.questions.map((q) => (
            <div className="field" key={q.key} style={{ marginTop: 14 }}>
              <label>{q.label}</label>
              {q.helper && <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 5 }}>{q.helper}</div>}
              {q.type === "textarea"
                ? <textarea className="input" rows={3} value={answers[q.key] || ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder="Your answer" />
                : <input className="input" value={answers[q.key] || ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder="Your answer" />}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Previous</button>
          {step < STEPS.length - 1
            ? <button className="btn btn-primary" disabled={!stepComplete} onClick={next}>{stepComplete ? "Continue →" : "Complete all fields to continue"}</button>
            : <button className="btn btn-primary" disabled={!stepComplete || busy} onClick={submit}>{busy ? "Submitting…" : "Submit"}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <Suspense fallback={<div className="center">Loading…</div>}>
      <OnboardingInner />
    </Suspense>
  );
}
