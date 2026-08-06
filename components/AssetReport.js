"use client";

// Asset Production client report. DEMO production pipeline in the SEO palette.
// Blueprint: Content service that MAKES the assets (statics, motion, UGC).
// Not a performance view (that's Creative/UGC) but a delivery board: what's being
// made, its stage, owner and due date, plus delivered files (auto-filed in Documents).
// The "In review" column is where the Reviewed / Needs another look loop will plug in.
const TYPE_TAG = {
  Static: { bg: "#EEE9F7", fg: "#5B2E9E" },
  Motion: { bg: "#E7F0FB", fg: "#1E5BB8" },
  UGC: { bg: "#FBE9F1", fg: "#A01E58" },
};
const STAGES = [
  { key: "Requested", items: [
    { type: "Static", name: "Diwali promo pack (5)", meta: "Owner: Grace · due Aug 14" },
    { type: "Motion", name: "App tutorial 15s", meta: "Owner: Sam · due Aug 20" },
  ] },
  { key: "In production", items: [
    { type: "UGC", name: "Jane aviator hook v4", meta: "Owner: Jane · due Aug 12" },
    { type: "Static", name: "Odds banners set", meta: "Owner: Grace · due Aug 11" },
    { type: "Motion", name: "Jackpot reveal anim", meta: "Owner: Sam · overdue Aug 5", overdue: true },
  ] },
  { key: "In review", items: [
    { type: "UGC", name: "Mike deposit v2", meta: "with client · sent Aug 6" },
    { type: "Static", name: "Welcome bonus creatives", meta: "with client · sent Aug 5" },
  ] },
  { key: "Delivered", items: [
    { type: "UGC", name: "Sara explainer v2", meta: "✓ delivered Aug 3", done: true },
    { type: "Static", name: "Ramadan set (8)", meta: "✓ delivered Aug 1", done: true },
  ] },
];
const DELIVERED = [
  ["Sara explainer v2", "UGC", "Sara", "Aug 3"],
  ["Ramadan static set (8)", "Static", "Grace", "Aug 1"],
  ["Brand intro motion v1", "Motion", "Sam", "Jul 28"],
];

function Tag({ t }) { const c = TYPE_TAG[t] || { bg: "#EEF0F3", fg: "#3C4657" }; return <span style={{ fontSize: 10, background: c.bg, color: c.fg, padding: "1px 7px", borderRadius: 20 }}>{t}</span>; }

export default function AssetReport({ isClient, name }) {
  return (
    <>
      {/* Summary */}
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>Production status <span className="pill p-agency" style={{ marginLeft: 4 }}>demo</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[["In production", "6", "var(--ink,#0B0D12)"], ["In review", "3", "#B4640C"], ["Delivered this month", "14", "#177E4E"], ["Overdue", "1", "#C0392B"]].map(([k, v, c]) => (
          <div key={k} style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 12, padding: 13 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 22, fontWeight: 600, color: c }}>{v}</div></div>
        ))}
      </div>

      {/* Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {STAGES.map((st) => (
          <div key={st.key}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, paddingLeft: 2 }}>{st.key} <span style={{ color: "var(--faint)" }}>{st.items.length}</span></div>
            {st.items.map((it) => (
              <div key={it.name} className="card" style={{ margin: "0 0 8px", padding: 11, border: it.overdue ? "1px solid #C0392B" : undefined, opacity: it.done ? 0.85 : 1 }}>
                <Tag t={it.type} />
                <div style={{ fontSize: 13, color: "var(--ink,#0B0D12)", marginTop: 6 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: it.overdue ? "#C0392B" : it.done ? "#177E4E" : "var(--faint)", marginTop: 4 }}>{it.meta}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Recently delivered (auto-filed in Documents) */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 15 }}>Recently delivered</b><span style={{ fontSize: 11, color: "var(--faint)" }}>auto-filed in Documents</span></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Asset</th><th style={{ fontWeight: 400 }}>Type</th><th style={{ fontWeight: 400 }}>Owner</th><th style={{ fontWeight: 400 }}>Delivered</th><th style={{ fontWeight: 400 }}></th>
            </tr></thead>
            <tbody>{DELIVERED.map(([a, t, o, d]) => (
              <tr key={a} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "9px 0" }}>{a}</td><td>{t}</td><td>{o}</td><td>{d}</td><td style={{ color: "#3D4EE8" }}>Open ↗</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
