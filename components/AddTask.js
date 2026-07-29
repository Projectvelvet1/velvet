"use client";
import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "../lib/supabase";

const PRIORITY = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]];
const FREQ = [["one_off", "One-off"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"]];

function fileToBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
}
function fileToText(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(file); });
}

// Self-assign task creator + AI bulk import. clients: [{id,name}]. fixedClient locks the client.
export default function AddTask({ me, clients = [], fixedClient = null, defaultServiceKey = "general", onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(fixedClient?.id || "");
  const [priority, setPriority] = useState("medium");
  const [frequency, setFrequency] = useState("one_off");
  const [dueDate, setDueDate] = useState("");
  const [link, setLink] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // bulk import
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impMsg, setImpMsg] = useState("");

  function matchClientId(name) {
    if (fixedClient) return fixedClient.id;
    if (!name) return null;
    const n = name.toLowerCase();
    const hit = clients.find((c) => c.name && (c.name.toLowerCase() === n || c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())));
    return hit ? hit.id : null;
  }

  async function runImport() {
    setImpBusy(true); setImpMsg(""); setErr("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const tok = sess.session?.access_token;
      let payload = null;
      if (file) {
        const type = file.type || "";
        if (type.startsWith("image/")) payload = { source: "image", media_type: type, data: await fileToBase64(file) };
        else if (type === "application/pdf") payload = { source: "pdf", data: await fileToBase64(file) };
        else if (type.startsWith("text/") || file.name.endsWith(".txt")) payload = { source: "text", text: await fileToText(file) };
        else { setImpMsg("For Word/Excel, please paste the text below or upload a PDF or image."); setImpBusy(false); return; }
      } else if (pasteText.trim()) {
        payload = { source: "text", text: pasteText.trim() };
      } else { setImpMsg("Upload a file or paste your worklist first."); setImpBusy(false); return; }

      const res = await fetch("/api/tasks-import", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { setImpMsg(j.error || "Import failed."); setImpBusy(false); return; }
      const rows = (j.tasks || []).map((t) => ({
        title: t.title, workspace_id: matchClientId(t.client), service_key: defaultServiceKey || "general",
        priority: "medium", frequency: "one_off", status: "todo", assignee_id: me, created_by: me,
      }));
      if (!rows.length) { setImpMsg("No tasks were found."); setImpBusy(false); return; }
      const { error } = await supabase.from("tasks").insert(rows);
      setImpBusy(false);
      if (error) { setImpMsg(error.message || "Could not save the tasks."); return; }
      onCreated && onCreated(); onClose && onClose();
    } catch (e) { setImpBusy(false); setImpMsg("Import error: " + (e?.message || String(e))); }
  }

  async function create(e) {
    e.preventDefault();
    if (!title.trim()) { setErr("Give the task a title."); return; }
    setBusy(true); setErr("");
    const row = {
      title: title.trim(), workspace_id: clientId || null, service_key: defaultServiceKey || "general",
      priority, frequency, due_date: dueDate || null, deliverable_link: link.trim() || null,
      description: desc.trim() || null, status: "todo", assignee_id: me, created_by: me,
    };
    const { error } = await supabase.from("tasks").insert(row);
    setBusy(false);
    if (error) { setErr(error.message || "Could not create the task."); return; }
    onCreated && onCreated(); onClose && onClose();
  }

  return (
    <Modal title="New task" onClose={onClose}>
      <div style={{ border: "0.5px solid var(--line)", background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>⚡ Bulk import from a document</div>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "4px 0 8px" }}>Upload your worklist (clients as headings, tasks as bullets) — AI reads it and creates one task per bullet under the matching client.{fixedClient ? " All tasks will go to " + fixedClient.name + "." : ""}</div>
        <input type="file" accept=".txt,.pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12, marginBottom: 8 }} />
        <textarea className="input" rows={3} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="…or paste your worklist here (works for anything you can copy)" style={{ marginBottom: 8 }} />
        <button type="button" className="btn btn-primary" onClick={runImport} disabled={impBusy}>{impBusy ? "Reading…" : "✨ Create tasks from document"}</button>
        {impMsg && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{impMsg}</div>}
        <div style={{ textAlign: "center", color: "var(--faint)", fontSize: 12, marginTop: 8 }}>— or add a single task below —</div>
      </div>

      <form onSubmit={create}>
        <div className="field"><label>Task title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Keyword research for the plumbing services page" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label>Client</label>
            {fixedClient ? <input className="input" value={fixedClient.name} disabled />
              : <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— No client (personal) —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>}
          </div>
          <div className="field"><label>Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label>Frequency</label>
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>{FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Due date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <div className="field"><label>Deliverable link (optional)</label>
          <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></div>
        <div className="field"><label>Notes</label>
          <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional notes..." /></div>
        {err && <div className="auth-msg auth-err">{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create task"}</button>
        </div>
      </form>
    </Modal>
  );
}
