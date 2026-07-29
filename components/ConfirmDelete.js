"use client";
import { useState } from "react";
import Modal from "./Modal";

// onConfirm(password) must return { ok: true } or { error: "message" }.
export default function ConfirmDelete({ title, message, onCancel, onConfirm }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await onConfirm(pw);
    setBusy(false);
    if (res && res.error) { setErr(res.error); return; }
  }
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="auth-msg auth-err" style={{ display: "block" }}>{message}</div>
      <form onSubmit={go}>
        <div className="field"><label>Confirm your password to delete</label>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your account password" autoFocus /></div>
        {err && <div className="auth-msg auth-err">{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ background: "var(--danger)", color: "#fff" }} disabled={busy || !pw}>{busy ? "Deleting…" : "Delete permanently"}</button>
        </div>
      </form>
    </Modal>
  );
}
