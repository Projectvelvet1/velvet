"use client";
import { useState } from "react";

// Analytics / Dashboarding client report. DEMO native view in Velvet's palette,
// PLUS a Looker embed tab (paste the data team's Looker report to show it exactly).
// Live version pulls from the sources the analytics team connected (GA4 / BigQuery / MMP).
const KPIS = [["Active users", "56,335", "▼ 19.5%"], ["New users", "22,293", "▼ 25.8%"], ["Sessions", "198,227", "▼ 18.8%"], ["Engagement rate", "65.1%", "▼ 2.1%"]];
const FUNNEL = [
  { label: "Installs", n: "22,293", pct: 100, color: "#3D4EE8" },
  { label: "Partial KYC started", n: "13,343", pct: 59.9, color: "#5865EB" },
  { label: "KYC successful", n: "11,153", pct: 50.0, color: "#8b95f0" },
  { label: "First deposit", n: "203", pct: 0.9, color: "#c0c6f7", flag: true },
];
const SOURCES = [["Organic Social", "902", "1,137"], ["Display", "1,485", "2,361"], ["Paid Search", "51", "393"], ["Paid Social", "3", "24"], ["Unassigned", "2,633", "4,878"]];
const APP_EVENTS = [["user_engagement", "430,044"], ["session_start", "192,182"], ["begin_onboarding", "60,439"], ["success_login", "23,244"], ["success_send_money", "21,057"]];
const WEB_EVENTS = [["page_view", "512,300"], ["scroll", "210,880"], ["session_start", "188,400"], ["form_start", "42,110"], ["sign_up_web", "12,940"], ["deposit_web", "3,220"]];
const TREND = [60, 55, 58, 70, 95, 120, 110, 100, 92, 85, 78, 70, 55];

export default function AnalyticsReport({ isClient, name }) {
  const [tab, setTab] = useState("overview");
  const [looker, setLooker] = useState("");
  const [draft, setDraft] = useState("");

  const evTable = (title, rows) => (
    <div className="card" style={{ marginTop: 12 }}>
      <b style={{ fontSize: 15 }}>{title}</b>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
          <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}><th style={{ padding: "6px 0", fontWeight: 400 }}>Event</th><th style={{ fontWeight: 400 }}>Count</th></tr></thead>
          <tbody>{rows.map(([e, c]) => <tr key={e} style={{ borderTop: "0.5px solid var(--line)" }}><td style={{ padding: "8px 0" }}>{e}</td><td>{c}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10, width: "fit-content", margin: "16px 0 12px" }}>
        {[["overview", "Overview"], ["looker", "Full report (Looker)"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className="btn" style={{ padding: "6px 14px", fontSize: 13, background: tab === v ? "#fff" : "transparent", border: "none", borderRadius: 8, fontWeight: tab === v ? 600 : 400 }}>{l}</button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "4px 0 8px" }}>Users &amp; engagement <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · connect GA4 / BigQuery</span> <span style={{ fontWeight: 400, color: "var(--faint)" }}>· last 30 days</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {KPIS.map(([k, v, d]) => (
              <div key={k} style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div><div style={{ fontSize: 11, color: "#C0392B" }}>{d}</div></div>
            ))}
          </div>

          <div className="card">
            <b style={{ fontSize: 15 }}>Conversion path: install → first deposit</b>
            <div style={{ marginTop: 14 }}>
              {FUNNEL.map((f) => (
                <div key={f.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span>{f.label}</span><span style={{ color: f.flag ? "#C0392B" : "var(--muted)", fontWeight: f.flag ? 600 : 400 }}>{f.n} · {f.pct}%</span></div>
                  <div style={{ height: 22, background: f.color, borderRadius: 5, width: Math.max(4, f.pct) + "%", transition: "width .2s" }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10 }}>Funnel steps come from the analytics team's tracking (measurement IDs). Biggest drop-off flagged.</div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <b style={{ fontSize: 15 }}>Where users come from</b>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
                <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}><th style={{ padding: "6px 0", fontWeight: 400 }}>Source</th><th style={{ fontWeight: 400 }}>Installs</th><th style={{ fontWeight: 400 }}>Active users</th></tr></thead>
                <tbody>{SOURCES.map(([sname, ins, au]) => <tr key={sname} style={{ borderTop: "0.5px solid var(--line)" }}><td style={{ padding: "8px 0" }}>{sname}</td><td>{ins}</td><td>{au}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 12 }}>
            <div className="card">
              <b style={{ fontSize: 15 }}>Installs trend</b>
              <svg viewBox="0 0 520 150" style={{ width: "100%", height: "auto", marginTop: 8 }}>
                <polyline fill="none" stroke="#3D4EE8" strokeWidth="2" points={TREND.map((v, i) => `${10 + i * 40},${150 - v}`).join(" ")} />
              </svg>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <b style={{ fontSize: 15, display: "block", textAlign: "left" }}>OS split</b>
              <svg viewBox="0 0 120 120" style={{ width: 120, height: 120, marginTop: 6 }}>
                <circle cx="60" cy="60" r="46" fill="none" stroke="#3D4EE8" strokeWidth="16" strokeDasharray="286 3" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="#c0c6f7" strokeWidth="16" strokeDasharray="3 286" strokeDashoffset="-286" transform="rotate(-90 60 60)" />
              </svg>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 12, color: "var(--muted)", marginTop: 4 }}><span>● Android 98.9%</span><span style={{ color: "#8b95f0" }}>● iOS 1.1%</span></div>
            </div>
          </div>

          {evTable("Top app events", APP_EVENTS)}
          {evTable("Top web events", WEB_EVENTS)}
        </>
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>Full analytics report (Looker Studio)</b>
            <span className="pill p-agency">the data team's report</span>
          </div>
          {looker ? (
            <iframe title="Looker report" src={looker} style={{ width: "100%", height: 620, border: "0.5px solid var(--line)", borderRadius: 10 }} allowFullScreen />
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                {isClient ? "Your full Looker analytics report will appear here once your team connects it." : "Paste the Looker Studio report's embed link (the data team enables ‘Embed report’ in Looker, then copy the embed URL). It shows the exact report, funnels and all, inside Velvet."}
              </div>
              {!isClient && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://lookerstudio.google.com/embed/reporting/…" />
                  <button className="btn btn-primary" onClick={() => setLooker(draft.trim())} disabled={!draft.trim()}>Show report</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
