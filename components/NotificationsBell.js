"use client";
import { useEffect, useState } from "react";
import { subscribe, markAllRead } from "../lib/notify";

const ICON = { review_approved: "✓", review_sent_back: "↩", task_assigned: "👤", access_granted: "🔑", questionnaire: "📋", onboarding_shared: "📤", info: "•" };

export default function NotificationsBell() {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => subscribe(setEvents), []);
  const unread = events.filter((e) => !e.read).length;
  return (
    <div style={{ position: "fixed", top: 16, right: 18, zIndex: 90 }}>
      <button aria-label="Notifications" onClick={() => { setOpen(!open); if (!open) setTimeout(markAllRead, 800); }}
        className="btn btn-ghost" style={{ padding: "8px 12px", background: "var(--paper,#fff)", position: "relative" }}>
        <span style={{ fontSize: 15 }}>🔔</span>
        {unread > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#C0392B", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px" }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 8, width: 320, maxHeight: 380, overflowY: "auto", background: "var(--paper,#fff)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 18px 50px rgba(0,0,0,.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <b style={{ fontSize: 14 }}>Notifications</b>
            <span style={{ fontSize: 12, color: "var(--faint)", cursor: "pointer" }} onClick={() => setOpen(false)}>Close</span>
          </div>
          {events.length === 0 ? <div style={{ padding: 16, fontSize: 13, color: "var(--faint)" }}>Nothing yet. Actions like reviews, assignments and shares will show here.</div>
            : events.slice(0, 40).map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 10, padding: "10px 14px", borderTop: "0.5px solid var(--line)" }}>
                <span style={{ flex: "none" }}>{ICON[e.type] || "•"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{e.text}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
