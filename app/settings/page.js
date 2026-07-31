"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import { loadAgencyDepts, DEPARTMENTS } from "../../lib/agencyNav";
import { SOURCES } from "../../lib/sources";

const ALL_SERVICES = [];
DEPARTMENTS.forEach((d) => d.services.forEach((s) => ALL_SERVICES.push({ key: s.key, label: s.label, dept: d.label })));

export default function Settings() {
  const router = useRouter();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [me, setMe] = useState({ id: null, name: "" });
  const [svc, setSvc] = useState(ALL_SERVICES[0]?.key || "seo");
  const [items, setItems] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load(serviceKey) {
    const { data } = await supabase.from("service_guidance")
      .select("id,kind,content,created_by_name,created_at")
      .eq("service_key", serviceKey).order("created_at", { ascending: false });
    setItems(data || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      setDepts(await loadAgencyDepts(session.user.id, !!prof?.is_super_admin));
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      setMe({ id: session.user.id, name: prof.full_name || prof.email });
      await load(svc);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => { if (!loading) load(svc); }, [svc]);

  const notes = items.filter((i) => i.kind === "note");
  const sourceKeys = items.filter((i) => i.kind === "source").map((i) => i.content);

  function fileToText(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(file); }); }

  async function addNote(text) {
    const content = (text ?? noteText).trim();
    if (!content) { setMsg("Write or paste something first."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.from("service_guidance").insert({ service_key: svc, kind: "note", content, created_by: me.id, created_by_name: me.name });
    setBusy(false);
    if (error) { setMsg(error.message || "Could not save."); return; }
    setNoteText(""); load(svc);
  }

  async function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const type = f.type || "";
    if (type.startsWith("text/") || /\.(txt|md|csv)$/i.test(f.name)) {
      const t = await fileToText(f);
      if (t.trim()) addNote(t.trim());
    } else { setMsg("Please upload a .txt, .md or .csv file, or paste the text below."); }
    e.target.value = "";
  }

  async function removeItem(id) {
    await supabase.from("service_guidance").delete().eq("id", id);
    load(svc);
  }

  async function toggleSource(key) {
    const existing = items.find((i) => i.kind === "source" && i.content === key);
    if (existing) { await supabase.from("service_guidance").delete().eq("id", existing.id); }
    else { await supabase.from("service_guidance").insert({ service_key: svc, kind: "source", content: key, created_by: me.id, created_by_name: me.name }); }
    load(svc);
  }

  if (loading) return <div className="center">Loading…</div>;
  const nav = <AgencyNav profile={profile} active="settings" depts={depts} />;
  const roleLabel = profile?.is_super_admin ? "Super admin" : "Team member";

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Settings</h1><span className="pill p-agency">{roleLabel}</span></div>

      <div className="card">
        <b>Ask Velvet training</b>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "4px 0 10px" }}>Teach Ask Velvet how your department wants its answers. Anyone in the agency can add or remove items. Pick a service, then add guidance (write, paste, or upload a .txt/.md/.csv) and choose the data sources it should use.</div>

        <div className="field" style={{ maxWidth: 320 }}>
          <label>Service</label>
          <select className="input" value={svc} onChange={(e) => setSvc(e.target.value)}>
            {ALL_SERVICES.map((s) => <option key={s.key} value={s.key}>{s.dept} · {s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <b>Training &amp; style</b>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "4px 0 10px" }}>Each item guides how answers are written for this service. Newest first, with who added it.</div>
        {notes.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 10 }}>No guidance added yet, Ask Velvet will use its neutral style for this service.</div>
          : notes.map((n) => (
            <div key={n.id} style={{ padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap", flex: 1 }}>{n.content}</div>
                <span style={{ cursor: "pointer", color: "var(--faint)", flex: "none" }} onClick={() => removeItem(n.id)}>✕</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>Added by {n.created_by_name || "someone"} · {new Date(n.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        <div style={{ marginTop: 12 }}>
          <textarea className="input" rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write or paste guidance, e.g. 'Lead with organic traffic trend, then top 3 keywords. Keep it to 3 sentences. Always compare to the nearest competitor.'" />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => addNote()} disabled={busy}>{busy ? "Saving…" : "Add guidance"}</button>
            <label className="btn btn-ghost" style={{ cursor: "pointer", margin: 0 }}>Upload .txt/.md/.csv<input type="file" accept=".txt,.md,.csv,text/*" onChange={onFile} style={{ display: "none" }} /></label>
            {msg && <span style={{ fontSize: 12, color: "var(--danger)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <b>Data sources for this service</b>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "4px 0 10px" }}>Tell Ask Velvet where this service's data should come from. If you pick a source that isn't connected yet, Ask Velvet will say it doesn't have that data (and why) instead of guessing.</div>
        {SOURCES.map((s) => {
          const on = sourceKeys.includes(s.key);
          return (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "0.5px solid var(--line)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={on} onChange={() => toggleSource(s.key)} />
                {s.label}
                <span className="pill" style={{ background: s.connected ? "#E7F6EF" : "#FBEAE6", color: s.connected ? "#177E4E" : "#C0392B" }}>{s.connected ? "connected" : "not connected"}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
