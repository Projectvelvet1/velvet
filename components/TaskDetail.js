"use client";
import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "../lib/supabase";
import { DEPARTMENTS } from "../lib/agencyNav";
import { notify, grantAccess } from "../lib/notify";

const LABELS = { todo: "To do", in_progress: "In progress", delivered: "Awaiting client", reviewed: "Reviewed", needs_look: "Needs another look", done: "Done" };
const PILL = { todo: { bg: "#EEF0FF", fg: "#3B49C7" }, in_progress: { bg: "#FCEFC3", fg: "#7A5B00" }, delivered: { bg: "#F0E9FB", fg: "#7C3AED" }, reviewed: { bg: "#E7F6EF", fg: "#177E4E" }, needs_look: { bg: "#FDEBD3", fg: "#B4640C" } };
const SVC_LABEL = {}; DEPARTMENTS.forEach((d) => d.services.forEach((x) => { SVC_LABEL[x.key] = x.label; }));
const initials = (n) => (n || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

// task, onClose. Optional: people [{id,name,side}], canReview, onChanged(updatedTask).
export default function TaskDetail({ task, onClose, people = [], canReview = false, onChanged }) {
  const [t, setT] = useState(task);
  const [reassigning, setReassigning] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!t) return null;

  let link = t.deliverable_link || "";
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
  const owner = people.find((p) => p.id === t.assignee_id);
  const st = PILL[t.status] || PILL.todo;
  const reviewable = canReview && (t.status === "delivered" || t.status === "in_progress" || t.status === "needs_look" || t.status === "reviewed");

  async function persist(patch) {
    const next = { ...t, ...patch }; setT(next); onChanged && onChanged(next);
    try { await supabase.from("tasks").update(patch).eq("id", t.id); } catch { /* in-memory still reflects it */ }
  }
  async function reassignTo(pid) {
    setBusy(true); const person = people.find((p) => p.id === pid);
    await persist({ assignee_id: pid || null });
    if (pid) { grantAccess(pid, `task: ${t.title}`, "assignment"); notify({ type: "task_assigned", text: `Task assigned to ${person?.name || "someone"}: ${t.title}`, meta: { taskId: t.id, assignee: pid } }); }
    else notify({ type: "task_assigned", text: `Owner cleared: ${t.title}`, meta: { taskId: t.id } });
    setBusy(false); setReassigning(false);
  }
  async function approve() {
    setBusy(true); await persist({ status: "reviewed" });
    notify({ type: "review_approved", text: `Approved: ${t.title}`, meta: { taskId: t.id } });
    setBusy(false);
  }
  async function sendBack() {
    if (!reason.trim()) return;
    setBusy(true); await persist({ status: "needs_look", client_note: reason.trim() });
    notify({ type: "review_sent_back", text: `Sent back: ${t.title}`, meta: { taskId: t.id, reason: reason.trim() } });
    setBusy(false); setSendingBack(false); setReason("");
  }

  const row = (label, val) => (val || val === 0) ? (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{val}</div>
    </div>
  ) : null;

  return (
    <Modal title={t.title || "Task"} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="pill" style={{ background: st.bg, color: st.fg }}>{LABELS[t.status] || t.status}</span>
        {t.priority && <span className="pill p-agency">{t.priority}</span>}
        {t.service_key && <span className="pill" style={{ background: "#EEF1F4", color: "#5B6472" }}>{SVC_LABEL[t.service_key] || t.service_key}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 12px", background: "var(--cloud,#F5F6F8)", borderRadius: 10 }}>
        <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{owner ? initials(owner.name) : "—"}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--faint)" }}>Owner</div>
          <div style={{ fontSize: 13 }}>{owner ? owner.name : "Unassigned"}{t.client ? ` · ${t.client}` : ""}</div>
        </div>
        {people.length > 0 && <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "6px 10px" }} onClick={() => setReassigning(!reassigning)}>{reassigning ? "Cancel" : "Reassign"}</button>}
      </div>

      {reassigning && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
            {people.map((p) => (
              <div key={p.id} onClick={() => !busy && reassignTo(p.id)} style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", borderTop: "0.5px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{initials(p.name)}</span>{p.name}{p.side ? <span style={{ fontSize: 11, color: "var(--faint)" }}>· {p.side}</span> : null}
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "#C0392B" }} disabled={busy} onClick={() => reassignTo(null)}>Clear owner</button>
        </div>
      )}

      {row("Due date", t.due_date)}
      {row("Description / notes", t.description)}
      {link ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 2 }}>Link</div>
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: "#2557C7" }}>{t.deliverable_link} ↗</a>
        </div>
      ) : null}
      {t.client_note ? row("Note / reason", t.client_note) : null}

      {reviewable && (
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Review</div>
          {!sendingBack ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={busy || t.status === "reviewed"} onClick={approve}>{t.status === "reviewed" ? "Approved" : "Approve"}</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setSendingBack(true)}>Send back</button>
            </div>
          ) : (
            <div>
              <textarea className="input" rows={3} placeholder="What needs another look? (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => { setSendingBack(false); setReason(""); }}>Cancel</button>
                <button className="btn btn-primary" disabled={busy || !reason.trim()} onClick={sendBack}>Send back</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
