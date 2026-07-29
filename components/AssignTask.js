"use client";
import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "../lib/supabase";

const PRIORITY = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]];
const FREQ = [["one_off", "One-off"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"]];

function fileToBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); }); }
function fileToText(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(file); }); }

// Assign a task to someone else, for a fixed client. people: [{id,name}].
export default function AssignTask({ me, client, serviceKey = "general", agencyPeople = [], clientPeople = [], onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("agency");
  const [assignTo, setAssignTo] = useState("");
  const people = target === "agency" ? agencyPeople : clientPeople;
  const [priority, setPriority] = useState("medium");
  const [frequency, setFrequency] = useState("one_off");
  const [dueDate, setDueDate] = useState("");
  const [link, setLink] = useState("");
  const [brief, setBrief] = useState("");
  const [shareWith, setShareWith] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impMsg, setImpMsg] = useState("");

  async function runImport() {
    if (!assignTo) { setImpMsg("Pick who to assign to first."); return; }
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
        else { setImpMsg("For Word/Excel, paste the text or use a PDF or image."); setImpBusy(false); return; }
      } else if (pasteText.trim()) { payload = { source: "text", text: pasteText.trim() }; }
      else { setImpMsg("Upload a file or paste a list first."); setImpBusy(false); return; }

      const res = await fetch("/api/tasks-import", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { setImpMsg(j.error || "Import failed."); setImpBusy(false); return; }
      const rows = (j.tasks || []).map((t) => ({ title: t.title, workspace_id: client.id, service_key: serviceKey, priority: "medium", frequency: "one_off", status: "todo", assignee_id: assignTo, created_by: me }));
      if (!rows.length) { setImpMsg("No tasks found."); setImpBusy(false); return; }
      const { error } = await supabase.from("tasks").insert(rows);
      setImpBusy(false);
      if (error) { setImpMsg(error.message || "Could not save."); return; }
      onCreated && onCreated(); onClose && onClose();
    } catch (e) { setImpBusy(false); setImpMsg("Import error: " + (e?.message || String(e))); }
  }

  async function assign(e) {
    e.preventDefault();
    if (!title.trim()) { setErr("Give the task a title."); return; }
    if (!assignTo) { setErr("Choose who to assign to."); return; }
    setBusy(true); setErr("");
    const row = {
      title: title.trim(), workspace_id: client.id, service_key: serviceKey,
      priority, frequency, due_date: dueDate || null, deliverable_link: link.trim() || null,
      description: brief.trim() || null, share_with: shareWith.trim() || null,
      status: "todo", assignee_id: assignTo, created_by: me,
    };
    const { error } = await supabase.from("tasks").insert(row);
    setBusy(false);
    if (error) { setErr(error.message || "Could not assign the task."); return; }
    onCreated && onCreated(); onClose && onClose();
  }

  return (
    <Modal title="Assign a task" onClose={onClose}>
      <div style={{ border: "0.5px solid var(--line)", background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>⚡ Bulk import from a document</div>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "4px 0 8px" }}>Upload a list and AI creates the tasks, all assigned to the person you choose below, for {client?.name}.</div>
        <input type="file" accept=".txt,.pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12, marginBottom: 8 }} />
        <textarea className="input" rows={3} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="…or paste the list here" style={{ marginBottom: 8 }} />
        <button type="button" className="btn btn-primary" onClick={runImport} disabled={impBusy}>{impBusy ? "Reading…" : "✨ Create tasks from document"}</button>
        {impMsg && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{impMsg}</div>}
        <div style={{ textAlign: "center", color: "var(--faint)", fontSize: 12, marginTop: 8 }}>— or assign a single task below —</div>
      </div>

      <form onSubmit={assign}>
        <div className="field"><label>Task title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Keyword research for the plumbing services page" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label>Client</label><input className="input" value={client?.name || ""} disabled /></div>
          <div className="field"><label>Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label>Frequency</label>
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>{FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Date needed by</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <div className="field"><label>Deliverable link (optional)</label>
          <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></div>
        <div className="field"><label>Brief / explanation</label>
          <textarea className="input" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Explain what needs doing and any context..." /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label>Assign to</label>
            <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 3, borderRadius: 8, marginBottom: 6, width: "fit-content" }}>
              {[["agency", "To the agency"], ["client", "To the client"]].map(([v, l]) => (
                <button type="button" key={v} onClick={() => { setTarget(v); setAssignTo(""); }} className="btn" style={{ padding: "5px 10px", fontSize: 12, background: target === v ? "#fff" : "transparent", boxShadow: target === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: target === v ? "var(--text)" : "var(--muted)" }}>{l}</button>
              ))}
            </div>
            <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">{people.length ? "— Select person —" : (target === "client" ? "No client-side people yet" : "No agency people")}</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="field"><label>Share result with (optional)</label>
            <input className="input" value={shareWith} onChange={(e) => setShareWith(e.target.value)} placeholder="e.g. Client IT team, Account manager" /></div>
        </div>
        {err && <div className="auth-msg auth-err">{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Assigning…" : "Assign task"}</button>
        </div>
      </form>
    </Modal>
  );
}
