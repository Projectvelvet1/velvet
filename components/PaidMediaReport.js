"use client";
import { useState } from "react";

// Paid Media client report. DEMO layout (AdSynth / Google-Ads style) in the SEO
// white-card palette, until the ad platforms are connected. Clearly tagged demo.
const CH = [
  { name: "Google Ads", color: "#2557C7", spend: 19400, roas: 4.2, cpa: 12.10, conv: 1603 },
  { name: "Meta", color: "#C0392B", spend: 16800, roas: 3.6, cpa: 15.40, conv: 1091 },
  { name: "TikTok", color: "#0E8C7A", spend: 8600, roas: 3.1, cpa: 16.90, conv: 509 },
  { name: "LinkedIn", color: "#7C3AED", spend: 3400, roas: 2.4, cpa: 18.70, conv: 191 },
];
const CAMPAIGNS = {
  running: [
    { name: "Search · Brand", status: "Eligible", tone: "#177E4E", spend: 8900, conv: 612, cpa: 10.20, roas: 5.1 },
    { name: "PMax · Prospecting", status: "Eligible", tone: "#177E4E", spend: 14300, conv: 988, cpa: 13.40, roas: 3.9 },
    { name: "App · Installs KE", status: "Eligible", tone: "#177E4E", spend: 11200, conv: 1140, cpa: 9.80, roas: 4.4 },
    { name: "Search · Non-brand", status: "Limited by budget", tone: "#B4640C", spend: 6800, conv: 402, cpa: 16.90, roas: 2.8 },
  ],
  stopped: [
    { name: "Display · Retargeting", status: "Paused", tone: "#9AA3B2", spend: 0, conv: 0, cpa: null, roas: null },
    { name: "Video · Awareness Q3", status: "Removed", tone: "#9AA3B2", spend: 0, conv: 0, cpa: null, roas: null },
  ],
};
const TREND = { Spend: [31200, 34800, 33100, 41900, 45300, 48200], ROAS: [3.1, 3.3, 3.2, 3.5, 3.6, 3.8], CPA: [17.8, 16.9, 17.1, 15.6, 14.9, 14.2] };
const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const money = (n) => "$" + n.toLocaleString();
const cell = { background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12 };

export default function PaidMediaReport({ isClient, name }) {
  const [metric, setMetric] = useState("Spend");
  const [hover, setHover] = useState(null);
  const [campTab, setCampTab] = useState("running");
  const series = TREND[metric];
  const max = Math.max(...series);
  const idx = hover != null ? hover : series.length - 1;
  const fmtVal = (v) => (metric === "Spend" ? money(v) : metric === "ROAS" ? v.toFixed(1) + "×" : "$" + v.toFixed(2));
  const camps = CAMPAIGNS[campTab];

  return (
    <>
      {/* ---- Stage 1: Google Ads connection metrics ---- */}
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>Google Ads <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · connect Google Ads</span> <span style={{ fontWeight: 400, color: "var(--faint)" }}>· last 30 days</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
        {[["Ad spend", money(48200), "▲ 6%"], ["ROAS", "3.8×", "▲ 0.3"], ["CPA", "$14.20", "▼ 8%"], ["Conversions", "3,394", "▲ 12%"]].map(([k, v, d]) => (
          <div key={k} style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div><div style={{ fontSize: 11, color: "#177E4E" }}>{d}</div></div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Installs</div><div style={{ fontSize: 18, fontWeight: 600 }}>2,140</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Total installs</div><div style={{ fontSize: 18, fontWeight: 600 }}>28,910</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Budget pacing</div><div style={{ fontSize: 18, fontWeight: 600 }}>82%{!isClient && <span style={{ fontSize: 11, color: "var(--muted)" }}> of {money(58800)}</span>}</div></div>
        {isClient
          ? <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Revenue attributed</div><div style={{ fontSize: 18, fontWeight: 600 }}>{money(183160)}</div></div>
          : <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Wasted spend</div><div style={{ fontSize: 18, fontWeight: 600, color: "#993C1D" }}>{money(3910)}</div></div>}
      </div>

      {/* ---- Stage 2: Current campaigns (Running / Stopped) ---- */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Current campaigns</b>
          <span style={{ display: "flex", gap: 6 }}>
            {[["running", `Running (${CAMPAIGNS.running.length})`], ["stopped", `Stopped (${CAMPAIGNS.stopped.length})`]].map(([v, l]) => (
              <button key={v} onClick={() => setCampTab(v)} className="btn" style={{ padding: "5px 13px", fontSize: 12, background: campTab === v ? "#0B0D12" : "transparent", color: campTab === v ? "#fff" : "var(--muted)", border: campTab === v ? "none" : "0.5px solid var(--line)", borderRadius: 20 }}>{l}</button>
            ))}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Campaign</th><th style={{ fontWeight: 400 }}>Status</th><th style={{ fontWeight: 400 }}>Spend</th><th style={{ fontWeight: 400 }}>Conv.</th>{!isClient && <th style={{ fontWeight: 400 }}>CPA</th>}<th style={{ fontWeight: 400 }}>ROAS</th>
            </tr></thead>
            <tbody>{camps.map((c) => (
              <tr key={c.name} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "10px 0" }}>{c.name}</td>
                <td><span style={{ color: c.tone, fontSize: 12 }}>● {c.status}</span></td>
                <td>{money(c.spend)}</td><td>{c.conv.toLocaleString()}</td>{!isClient && <td>{c.cpa ? "$" + c.cpa.toFixed(2) : "—"}</td>}<td>{c.roas ? c.roas.toFixed(1) + "×" : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* ---- Stage 3: Channel breakdown ---- */}
      <div className="card" style={{ marginTop: 12 }}>
        <b style={{ fontSize: 15 }}>{isClient ? "Where your budget went" : "Channel breakdown"}</b>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Channel</th><th style={{ fontWeight: 400 }}>Spend</th><th style={{ fontWeight: 400 }}>ROAS</th>{!isClient && <th style={{ fontWeight: 400 }}>CPA</th>}<th style={{ fontWeight: 400 }}>Conv.</th>
            </tr></thead>
            <tbody>{CH.map((c) => (
              <tr key={c.name} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "9px 0" }}><span style={{ width: 8, height: 8, background: c.color, borderRadius: 2, display: "inline-block", marginRight: 7 }} />{c.name}</td>
                <td>{money(c.spend)}</td><td>{c.roas.toFixed(1)}×</td>{!isClient && <td>${c.cpa.toFixed(2)}</td>}<td>{c.conv.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* ---- Stage 3: Trend ---- */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b style={{ fontSize: 15 }}>Trend</b>
          <span style={{ display: "flex", gap: 6 }}>
            {["Spend", "ROAS", ...(isClient ? [] : ["CPA"])].map((m) => (
              <button key={m} onClick={() => { setMetric(m); setHover(null); }} className="btn" style={{ padding: "4px 12px", fontSize: 12, background: metric === m ? "#0B0D12" : "transparent", color: metric === m ? "#fff" : "var(--muted)", border: metric === m ? "none" : "0.5px solid var(--line)", borderRadius: 8 }}>{m}</button>
            ))}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 700 }}>{fmtVal(series[idx])}</span>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>{MONTHS[idx]} 26</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {series.map((v, i) => { const h = Math.max(6, Math.round((v / max) * 104)); const active = i === idx; return (
            <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }} title={fmtVal(v)}>
              <div style={{ width: "100%", height: h, background: active ? "#C0392B" : "var(--line)", borderRadius: "6px 6px 0 0", transition: "background .12s" }} />
              <span style={{ fontSize: 10, color: active ? "var(--text)" : "var(--faint)" }}>{MONTHS[i]}</span>
            </div>
          ); })}
        </div>
      </div>
    </>
  );
}
