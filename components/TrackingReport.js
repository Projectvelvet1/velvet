"use client";

// Tracking health board. DEMO status view: what's connected, pending or broken,
// which events are firing, setup health and recent changes. Live version runs
// health checks against the connected sources (GA4 / GTM / pixels / MMP).
const CONNECTIONS = [
  ["Google Analytics 4", "Web + App", "ok", "Connected", "2h ago"],
  ["Google Tag Manager", "Web", "ok", "Connected", "2h ago"],
  ["Meta Pixel & CAPI", "Web", "ok", "Connected", "2h ago"],
  ["AppsFlyer (MMP)", "App", "ok", "Connected", "2h ago"],
  ["BigQuery export", "Warehouse", "ok", "Connected", "2h ago"],
  ["TikTok Pixel", "Web", "warn", "Pending access", "—"],
  ["Server-side GTM", "Server", "warn", "Pending setup", "—"],
  ["Google Ads Conversions", "Web", "bad", "Not firing", "1d ago"],
];
const EVENTS = [
  ["first_open", "App", "ok", "Firing", "3m ago"],
  ["begin_signup", "App + Web", "ok", "Firing", "5m ago"],
  ["kyc_start", "App", "ok", "Firing", "8m ago"],
  ["first_deposit", "App", "ok", "Firing", "22m ago"],
  ["purchase (web)", "Web", "bad", "No data 48h", "2d ago"],
  ["add_to_cart", "Web", "warn", "Defined, not firing", "—"],
];
const CHECKLIST = [
  ["ok", "GA4 measurement ID installed"],
  ["ok", "GTM container published"],
  ["ok", "Consent mode / GDPR configured"],
  ["warn", "Server-side tagging in progress"],
  ["bad", "Google Ads conversion tag not firing"],
];
const CHANGES = [
  ["Added kyc_start & kyc_success events", "Aug 4 · Analytics team"],
  ["Meta CAPI server events live", "Aug 2 · Analytics team"],
  ["Fixed duplicate purchase event", "Jul 30 · Analytics team"],
];
const TONE = { ok: "#177E4E", warn: "#B4640C", bad: "#C0392B" };
const cell = { background: "var(--cloud,#F5F6F8)", borderRadius: 12, padding: 13 };

function StatusTable({ title, cols, rows }) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <b style={{ fontSize: 15 }}>{title}</b>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
          <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>{cols.map((c) => <th key={c} style={{ padding: "6px 0", fontWeight: 400 }}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r[0]} style={{ borderTop: "0.5px solid var(--line)" }}>
              <td style={{ padding: "9px 0" }}>{r[0]}</td>
              <td style={{ color: "var(--muted)" }}>{r[1]}</td>
              <td><span style={{ color: TONE[r[2]], fontSize: 12 }}>● {r[3]}</span></td>
              <td style={{ color: "var(--faint)" }}>{r[4]}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function TrackingReport({ isClient, name }) {
  return (
    <>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>Tracking setup <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · connect sources</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Connections</div><div style={{ fontSize: 22, fontWeight: 600 }}>5<span style={{ fontSize: 13, color: "var(--faint)" }}> / 8</span></div><div style={{ fontSize: 11, color: "#177E4E" }}>connected</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Pending</div><div style={{ fontSize: 22, fontWeight: 600, color: "#B4640C" }}>2</div><div style={{ fontSize: 11, color: "var(--faint)" }}>awaiting access</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Needs attention</div><div style={{ fontSize: 22, fontWeight: 600, color: "#C0392B" }}>1</div><div style={{ fontSize: 11, color: "var(--faint)" }}>not firing</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Events healthy</div><div style={{ fontSize: 22, fontWeight: 600 }}>9<span style={{ fontSize: 13, color: "var(--faint)" }}> / 11</span></div><div style={{ fontSize: 11, color: "#177E4E" }}>firing</div></div>
      </div>

      <StatusTable title="Connections" cols={["Source", "Type", "Status", "Last checked"]} rows={CONNECTIONS} />
      <StatusTable title="Tracked events" cols={["Event", "Platform", "Status", "Last seen"]} rows={EVENTS} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div className="card">
          <b style={{ fontSize: 15 }}>Setup health</b>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {CHECKLIST.map(([t, label], i) => (
              <div key={label} style={{ display: "flex", gap: 8, padding: "7px 0", borderTop: i ? "0.5px solid var(--line)" : "none" }}>
                <span style={{ color: TONE[t] }}>{t === "ok" ? "✓" : t === "warn" ? "◐" : "✕"}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <b style={{ fontSize: 15 }}>Recent tracking changes</b>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {CHANGES.map(([what, when], i) => (
              <div key={what} style={{ padding: "7px 0", borderTop: i ? "0.5px solid var(--line)" : "none" }}>
                <div>{what}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{when}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
