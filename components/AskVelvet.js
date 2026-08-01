"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

// Reusable Ask Velvet chat panel (agency only).
// - No focus: answers across the person's clients (dashboard).
// - focusWorkspaceId set: answers ONLY about that one client (+ service).
export default function AskVelvet({ focusWorkspaceId = null, serviceKey = null, suggestions = [] }) {
  const [input, setInput] = useState("");
  const [thread, setThread] = useState([]);
  const [ctx, setCtx] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ask = async (q) => {
    const text = (q ?? input).trim(); if (!text || busy) return;
    const t = [...thread, { role: "user", content: text }];
    setThread(t); setInput(""); setBusy(true); setErr("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const body = { messages: t, context: ctx || undefined };
      if (focusWorkspaceId) { body.focusWorkspaceId = focusWorkspaceId; if (serviceKey) body.serviceKey = serviceKey; }
      const res = await fetch("/api/ask-velvet", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify(body) });
      const j = await res.json(); setBusy(false);
      if (!res.ok) { setErr(j.error || "Ask Velvet couldn't answer."); return; }
      setThread([...t, { role: "assistant", content: j.answer || "No answer." }]);
      if (j.context) setCtx(j.context);
    } catch (e) { setBusy(false); setErr("Ask Velvet error: " + (e?.message || String(e))); }
  };
  const reset = () => { setThread([]); setCtx(""); setErr(""); setInput(""); };

  return (
    <div style={{ background: "#0B0D12", borderRadius: 14, padding: 16, marginBottom: 14, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <b style={{ fontSize: 15 }}>✨ Ask Velvet</b>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {thread.length > 0 && <span onClick={reset} style={{ fontSize: 12, color: "#9AA3B2", cursor: "pointer" }}>New chat</span>}
          <span style={{ fontSize: 11, color: "#9AA3B2", border: "0.5px solid #2A3550", borderRadius: 20, padding: "2px 10px" }}>agency only</span>
        </span>
      </div>

      {thread.length === 0 && suggestions.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {suggestions.map((sug, i) => (
            <button key={i} onClick={() => ask(sug)} disabled={busy} style={{ background: i === 0 ? "var(--gold,#F7C948)" : "transparent", color: i === 0 ? "#0B0D12" : "#E7EAF0", border: i === 0 ? "none" : "0.5px solid #2A3550", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: i === 0 ? 600 : 400, cursor: "pointer" }}>{sug}</button>
          ))}
        </div>
      )}

      {thread.length > 0 && (
        <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {thread.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? "var(--gold,#F7C948)" : "#15181F", color: m.role === "user" ? "#0B0D12" : "#E7EAF0", border: m.role === "user" ? "none" : "0.5px solid #2A3550", borderRadius: 12, padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.content}</div>
          ))}
          {busy && <div style={{ alignSelf: "flex-start", color: "#9AA3B2", fontSize: 12, padding: "4px 2px" }}>Ask Velvet is reading the latest data…</div>}
        </div>
      )}
      {thread.length === 0 && busy && <div style={{ fontSize: 12, color: "#9AA3B2", marginBottom: 10 }}>Ask Velvet is reading the latest data…</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder={thread.length ? "Reply…" : "Ask about this client's performance…"} style={{ flex: 1, background: "#15181F", border: "0.5px solid #2A3550", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14 }} />
        <button onClick={() => ask()} disabled={busy} style={{ background: "var(--gold,#F7C948)", color: "#0B0D12", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{busy ? "…" : "Ask"}</button>
      </div>
      {err && <div style={{ fontSize: 12, color: "#F2B4A3", marginTop: 10 }}>{err}</div>}
    </div>
  );
}
