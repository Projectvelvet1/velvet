"use client";
import { useEffect } from "react";

// Props:
//  service: { key, label, color, dept, clients:[{id,name,industry,health}], team:[{id,name,role,clients:[names]}] }
//  onClose(), onOpenClient(id)
const HEALTH = { healthy: { l: "Healthy", bg: "#E4F6EC", fg: "#177E4E" }, watch: { l: "To watch", bg: "#FDEBD3", fg: "#B4640C" }, risk: { l: "At risk", bg: "#FBEAE6", fg: "#C0392B" }, held: { l: "Held", bg: "#EEF1F4", fg: "#5B6472" } };
const initials = (n) => (n || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export default function ServiceDrawer({ service, onClose, onOpenClient }) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("modal-open"); window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  if (!service) return null;
  const clients = service.clients || [];
  const team = service.team || [];
  return (
    <div className="drawer-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer narrow" role="dialog" aria-label={`${service.label} service`}>
        <div className="drawer-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: service.color || "#64748b", display: "inline-block" }} />
              <b style={{ fontSize: 17 }}>{service.label}</b>
            </div>
            <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>{service.dept} · {clients.length} client{clients.length === 1 ? "" : "s"}</div>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Clients using this service</div>
          {clients.length === 0 ? <div className="empty" style={{ padding: 20 }}>No clients on this service yet.</div>
            : clients.map((c) => {
              const h = HEALTH[c.health] || HEALTH.healthy;
              return (
                <div key={c.id} onClick={() => onOpenClient && onOpenClient(c.id)} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" && onOpenClient) onOpenClient(c.id); }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--line)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(c.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--faint)" }}>{c.industry || "—"}</div>
                    </div>
                  </div>
                  <span className="pill" style={{ background: h.bg, color: h.fg, flex: "none" }}>{h.l}</span>
                </div>
              );
            })}

          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "18px 0 8px" }}>Team on this department</div>
          {team.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No one assigned yet.</div>
            : team.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--line)" }}>
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(m.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name} <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 400 }}>· {m.role || "Team"}</span></div>
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>{(m.clients && m.clients.length) ? m.clients.join(", ") : "No clients yet"}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
