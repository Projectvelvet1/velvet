"use client";
import Modal from "./Modal";

const LABELS = { todo: "To do", in_progress: "In progress", delivered: "Delivered", reviewed: "Reviewed", needs_look: "Needs another look", done: "Done" };

export default function TaskDetail({ task, onClose }) {
  if (!task) return null;
  let link = task.deliverable_link || "";
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
  const row = (label, val) => (val || val === 0) ? (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{val}</div>
    </div>
  ) : null;
  return (
    <Modal title={task.title || "Task"} onClose={onClose}>
      {row("Status", LABELS[task.status] || task.status)}
      {row("Priority", task.priority)}
      {row("Frequency", task.frequency && task.frequency !== "one_off" ? task.frequency : null)}
      {row("Due date", task.due_date)}
      {row("Description / notes", task.description)}
      {link ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 2 }}>Link</div>
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: "#2557C7" }}>{task.deliverable_link} ↗</a>
        </div>
      ) : null}
      {task.client_note ? row("Client note", task.client_note) : null}
      {!task.description && !link && !task.client_note && <div style={{ fontSize: 13, color: "var(--faint)" }}>No description or link was added to this task.</div>}
    </Modal>
  );
}
