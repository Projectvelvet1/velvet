"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import { loadAgencyDepts } from "../../lib/agencyNav";

export const dynamic = "force-dynamic";

function QuestionsInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [phase, setPhase] = useState(search.get("phase") === "full" ? "full" : "discovery");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  async function loadRows(ph) {
    const { data } = await supabase.from("onboarding_questions").select("id,question_key,label,helper,answer_type,sort_order").eq("phase", ph).order("sort_order");
    setRows((data || []).map((r) => ({ ...r })));
  }
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency" || !prof?.is_super_admin) { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, true));
      await loadRows(phase); setLoading(false);
    })();
  }, [router]);

  async function switchPhase(ph) { setPhase(ph); await loadRows(ph); }
  function edit(i, field, val) { setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row)); }
  function add() { setRows((r) => [...r, { label: "", helper: "", answer_type: "text", sort_order: r.length + 1 }]); }
  function del(i) { setRows((r) => r.filter((_, idx) => idx !== i)); }
  function move(i, dir) {
    setRows((r) => {
      const n = [...r]; const j = i + dir; if (j < 0 || j >= n.length) return n;
      [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  }
  async function save() {
    setBusy(true); setFlash("");
    const { data } = await supabase.auth.getSession();
    const payload = rows.filter((r) => (r.label || "").trim()).map((r, i) => ({ id: r.id, question_key: r.question_key, label: r.label, helper: r.helper, answer_type: r.answer_type, sort_order: i + 1 }));
    const res = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ phase, questions: payload }) });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setFlash(j.error || "Could not save"); return; }
    setRows((j.questions || []).map((r) => ({ ...r }))); setFlash("Saved.");
    setTimeout(() => setFlash(""), 5000);
  }

  async function organise() {
    setAiErr(""); if (!aiText.trim()) { setAiErr("Paste some questions first."); return; }
    setAiBusy(true);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/questions-ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ phase, text: aiText }) });
    const j = await res.json(); setAiBusy(false);
    if (!res.ok) { setAiErr(j.error || "Could not organise"); return; }
    // replace the editor with the AI's set for review (not saved until you click Save)
    setRows((j.questions || []).map((q, i) => ({ label: q.label, helper: q.helper, answer_type: q.answer_type, sort_order: i + 1 })));
    setAiText(""); setFlash("AI organised your questions below. Review, tweak, then Save changes.");
    setTimeout(() => setFlash(""), 8000);
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel="Super admin" nav={<AgencyNav profile={profile} active="questions" depts={depts} />}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Edit onboarding questions</h1>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button className={"pill " + (phase === "discovery" ? "p-client" : "")} style={{ cursor: "pointer", border: "1px solid var(--line)" }} onClick={() => switchPhase("discovery")}>Discovery (prospects)</button>
        <button className={"pill " + (phase === "full" ? "p-client" : "")} style={{ cursor: "pointer", border: "1px solid var(--line)" }} onClick={() => switchPhase("full")}>Full (signed clients)</button>
      </div>
      {flash && <div className="auth-msg auth-ok" style={{ display: "inline-block" }}>{flash}</div>}

      {rows.length === 0 ? <div className="empty">No questions yet. Click “Add question”.</div> : rows.map((r, i) => (
        <div className="card" key={r.id || "new" + i}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "var(--faint)" }}>Question {i + 1}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => move(i, -1)}>↑</button>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => move(i, 1)}>↓</button>
              <button className="btn btn-ghost" style={{ padding: "4px 8px", color: "var(--danger)" }} onClick={() => del(i)}>Delete</button>
            </div>
          </div>
          <div className="field"><label>Question</label>
            <input className="input" value={r.label || ""} onChange={(e) => edit(i, "label", e.target.value)} placeholder="e.g. What is your biggest challenge?" /></div>
          <div className="field"><label>Helper text (optional)</label>
            <input className="input" value={r.helper || ""} onChange={(e) => edit(i, "helper", e.target.value)} placeholder="A hint shown under the question" /></div>
          <div className="field"><label>Answer type</label>
            <select className="input" value={r.answer_type || "text"} onChange={(e) => edit(i, "answer_type", e.target.value)}>
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
            </select></div>
        </div>
      ))}

      <button className="btn btn-ghost" onClick={add} style={{ marginTop: 6 }}>+ Add question</button>

      <div className="card" style={{ marginTop: 22, borderColor: "var(--border-accent)" }}>
        <b>Upload questions & AI summariser</b>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 10px" }}>
          Paste a rough list of questions and let AI organise them into a clean, ordered set. It replaces the editor above for your review — nothing is saved until you click “Save changes”.
        </p>
        {aiErr && <div className="auth-msg auth-err">{aiErr}</div>}
        <textarea className="input" rows={6} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder={"Paste your questions here, one per line or however you have them…"} />
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-primary" onClick={organise} disabled={aiBusy}>{aiBusy ? "Organising…" : "Organise with AI"}</button>
        </div>
      </div>
    </Shell>
  );
}

export default function Questions() {
  return (<Suspense fallback={<div className="center">Loading…</div>}><QuestionsInner /></Suspense>);
}
