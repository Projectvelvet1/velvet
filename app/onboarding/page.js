"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { loadQuestions } from "../../lib/onboardingQuestions";

export const dynamic = "force-dynamic";

function OnboardingInner() {
  const router = useRouter();
  const search = useSearchParams();
  const wsParam = search.get("ws");
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("discovery");
  const [asAgency, setAsAgency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      let wk = null;
      if (wsParam) {
        const res = await fetch(`/api/client-context?id=${wsParam}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { const j = await res.json(); wk = j.workspace; setAsAgency(true); }
      } else {
        const { data: w } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,discovery_complete").limit(1);
        wk = w?.[0] || null;
      }
      setWs(wk);
      if (wk) {
        const ph = wk.phase === "prospect" ? "discovery" : "full";
        setPhase(ph);
        const qs = await loadQuestions(ph); setQuestions(qs);
        const { data: resp } = await supabase.from("onboarding_responses").select("question_key,answer").eq("workspace_id", wk.id).eq("phase", ph);
        const a = {}; (resp || []).forEach((r) => (a[r.question_key] = r.answer)); setAnswers(a);
        if ((ph === "discovery" && wk.discovery_complete) || (ph === "full" && wk.onboarding_complete)) setDone(true);
      }
      setLoading(false);
    })();
  }, [router, wsParam]);

  const total = questions.length;
  const filled = questions.filter((q) => (answers[q.key] || "").trim()).length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  const allDone = total > 0 && filled === total;

  async function submit() {
    if (!ws) return;
    setBusy(true);
    const rows = questions.map((q) => ({ workspace_id: ws.id, phase, question_key: q.key, answer: answers[q.key] || "", updated_at: new Date().toISOString() }));
    await supabase.from("onboarding_responses").upsert(rows, { onConflict: "workspace_id,phase,question_key" });
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/onboarding-complete", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ workspaceId: ws.id, phase }) });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || "We saved your answers but couldn't finish. Please click Submit again."); return; }
    setErr(""); setDone(true);
  }

  if (loading) return <div className="center">Loading…</div>;

  if (done) return (
    <div className="auth-wrap" style={{ alignItems: "center" }}>
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-logo"><span className="tile"><img src="/mark.png" alt="" /></span></div>
        <h1>Thank you 🙌</h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{asAgency ? "Answers saved for this client." : "We've received your answers. Your Welcome Tomorrow team will be in touch shortly."}</p>
        <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => router.replace(asAgency ? `/client/${ws.id}` : "/dashboard")}>{asAgency ? "Back to client" : "Back to your space"}</button>
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
          <h1 style={{ fontSize: 26, marginTop: 14 }}>{phase === "full" ? "Client onboarding" : "Let's get to know your business"}</h1>
          <p style={{ color: "var(--on-dark-mut)", fontSize: 14 }}>{asAgency ? "Filling in on the client's behalf." : "A few quick questions so we can help you best."}</p>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 720, marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          <span>{filled} of {total} answered</span><span>{pct}% complete</span>
        </div>
        <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: "100%", width: pct + "%", background: "var(--gold)" }} />
        </div>

        {total === 0 ? (
          <div className="empty">No questions have been set up yet. Ask a super admin to add them under Edit questions.</div>
        ) : (
          <div className="card">
            {questions.map((q) => (
              <div className="field" key={q.key} style={{ marginTop: 6 }}>
                <label>{q.label}</label>
                {q.helper && <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 5 }}>{q.helper}</div>}
                {q.type === "textarea"
                  ? <textarea className="input" rows={3} value={answers[q.key] || ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder="Your answer" />
                  : <input className="input" value={answers[q.key] || ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder="Your answer" />}
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" disabled={!allDone || busy} onClick={submit}>{busy ? "Submitting…" : allDone ? "Submit" : "Complete all fields to submit"}</button>
            {err && <div className="auth-msg auth-err" style={{ marginTop: 10 }}>{err}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (<Suspense fallback={<div className="center">Loading…</div>}><OnboardingInner /></Suspense>);
}
