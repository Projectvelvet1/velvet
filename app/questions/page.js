"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import { loadAgencyDepts } from "../../lib/agencyNav";

const TYPES = [["text", "Short text"], ["textarea", "Long text"], ["url", "Link / URL"], ["select", "Pick one"], ["multiselect", "Pick many"], ["contact", "Contact block"], ["ack", "Acknowledgment"]];
const slug = (s) => (s || "field").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "field";

export default function Questions() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [scopeSel, setScopeSel] = useState("default"); // 'default' or a workspace id
  const [def, setDef] = useState([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");

  async function tok() { const { data } = await supabase.auth.getSession(); return data.session?.access_token; }

  async function loadForm(sel) {
    const t = await tok();
    const q = sel === "default" ? "" : `?workspaceId=${sel}`;
    const r = await fetch(`/api/onboarding-form${q}`, { headers: { Authorization: `Bearer ${t}` } });
    const j = await r.json();
    setDef(JSON.parse(JSON.stringify(j.definition || [])));
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency" || !prof?.is_super_admin) { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, true));
      const { data: ws } = await supabase.from("workspaces").select("id,name,phase").order("name");
      setClients((ws || []).filter((w) => w.phase === "signed"));
      setProspects((ws || []).filter((w) => w.phase === "prospect"));
      await loadForm("default");
      setLoading(false);
    })();
  }, [router]);

  function onScope(sel) { setScopeSel(sel); setFlash(""); setErr(""); loadForm(sel); }

  // editing helpers
  const upSection = (si, patch) => setDef((d) => d.map((s, i) => i === si ? { ...s, ...patch } : s));
  const upQ = (si, qi, patch) => setDef((d) => d.map((s, i) => i !== si ? s : { ...s, questions: s.questions.map((q, j) => j === qi ? { ...q, ...patch } : q) }));
  const addQ = (si) => setDef((d) => d.map((s, i) => i !== si ? s : { ...s, questions: [...s.questions, { key: "q_" + Math.random().toString(36).slice(2, 7), label: "New question", type: "text" }] }));
  const rmQ = (si, qi) => setDef((d) => d.map((s, i) => i !== si ? s : { ...s, questions: s.questions.filter((_, j) => j !== qi) }));
  const addSection = () => setDef((d) => [...d, { title: "New section", subtitle: "", questions: [] }]);
  const rmSection = (si) => setDef((d) => d.filter((_, i) => i !== si));

  async function save() {
    setBusy(true); setErr(""); setFlash("");
    const body = scopeSel === "default" ? { scope: "default", definition: def } : { scope: "client", workspaceId: scopeSel, definition: def };
    const r = await fetch("/api/onboarding-form", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tok()}` }, body: JSON.stringify(body) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setErr(j.error || "Could not save."); return; }
    setFlash(scopeSel === "default" ? "Saved. This applies to all future onboards." : "Saved. This applies to the selected client only.");
  }

  if (loading) return <div className="center">Loading…</div>;
  const nav = <AgencyNav profile={profile} active="settings" depts={depts} />;
  const scopeName = scopeSel === "default" ? "All future onboards" : ([...clients, ...prospects].find((w) => w.id === scopeSel)?.name || "client");

  return (
    <Shell profile={profile} roleLabel="Super admin" nav={nav}>
      <div className="page-head"><div><span onClick={() => router.push("/settings")} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 13 }}>← Settings</span><h1 style={{ fontSize: 24, marginTop: 2 }}>Onboarding questions</h1></div></div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Apply changes to</label>
        <select className="input" style={{ marginTop: 8 }} value={scopeSel} onChange={(e) => onScope(e.target.value)}>
          <option value="default">All future onboards (the default form)</option>
          {clients.length > 0 && <optgroup label="Current clients">{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
          {prospects.length > 0 && <optgroup label="Future clients">{prospects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
        </select>
        <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>
          {scopeSel === "default" ? "Edits here become the questions every new onboarding uses." : `Edits here apply to ${scopeName}'s onboarding only. Everyone else keeps the default.`}
        </div>
      </div>

      {def.map((s, si) => (
        <div key={si} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input className="input" value={s.title} onChange={(e) => upSection(si, { title: e.target.value })} placeholder="Section title" style={{ fontWeight: 600 }} />
            <button className="btn btn-ghost" style={{ color: "var(--danger)", flex: "none" }} onClick={() => rmSection(si)}>Remove</button>
          </div>
          <input className="input" value={s.subtitle || ""} onChange={(e) => upSection(si, { subtitle: e.target.value })} placeholder="Section subtitle (optional)" style={{ marginBottom: 12 }} />

          {s.questions.map((q, qi) => (
            <div key={qi} style={{ border: "0.5px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={q.label} onChange={(e) => upQ(si, qi, { label: e.target.value })} placeholder="Question" />
                <select className="input" style={{ width: 150, flex: "none" }} value={q.type || "text"} onChange={(e) => upQ(si, qi, { type: e.target.value })}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn btn-ghost" style={{ color: "var(--danger)", flex: "none" }} onClick={() => rmQ(si, qi)}>✕</button>
              </div>
              <input className="input" value={q.helper || ""} onChange={(e) => upQ(si, qi, { helper: e.target.value })} placeholder="Helper text (optional)" style={{ marginTop: 8 }} />
              {(q.type === "select" || q.type === "multiselect") && (
                <textarea className="input" style={{ marginTop: 8 }} rows={3} value={(q.options || []).join("\n")} onChange={(e) => upQ(si, qi, { options: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} placeholder="One option per line" />
              )}
              {q.type === "contact" && (
                <textarea className="input" style={{ marginTop: 8 }} rows={3} value={(q.fields || []).map(([, l]) => l).join("\n")} onChange={(e) => upQ(si, qi, { fields: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).map((l) => [slug(l), l]) })} placeholder="One contact field label per line (e.g. Full name)" />
              )}
              {q.type === "ack" && (
                <textarea className="input" style={{ marginTop: 8 }} rows={2} value={q.ackText || ""} onChange={(e) => upQ(si, qi, { ackText: e.target.value })} placeholder="The statement the client must acknowledge" />
              )}
            </div>
          ))}
          <button className="btn btn-ghost" onClick={() => addQ(si)}>+ Add question</button>
        </div>
      ))}

      <button className="btn btn-ghost" onClick={addSection} style={{ marginBottom: 14 }}>+ Add section</button>

      {err && <div className="auth-msg auth-err" style={{ marginBottom: 10 }}>{err}</div>}
      {flash && <div className="auth-msg auth-ok" style={{ marginBottom: 10 }}>{flash}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : `Save for: ${scopeName}`}</button>
        <button className="btn btn-ghost" onClick={() => onScope(scopeSel)}>Reset</button>
      </div>
    </Shell>
  );
}
