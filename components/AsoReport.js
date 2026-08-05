"use client";
import { useState } from "react";

// ASO client report. DEMO layout in the SEO white-card palette, until
// App Store Connect + Google Play Console (AppTweak later) are connected.
// Blueprint metrics: keyword rankings, store conversion rates, installs.
const PLATFORMS = [
  { name: "App Store (iOS)", color: "#0B0D12", impr: 331000, views: 214000, cvr: 4.8, installs: 10240, rating: 4.6 },
  { name: "Google Play (Android)", color: "#0E8C7A", impr: 281000, views: 186000, cvr: 4.4, installs: 8180, rating: 4.3 },
];
const KEYWORDS = [
  { kw: "betting app", rank: 3, chg: 2, pop: 68 },
  { kw: "aviator game", rank: 5, chg: 1, pop: 61 },
  { kw: "jackpot predictions", rank: 9, chg: -3, pop: 52 },
  { kw: "live scores", rank: 12, chg: 0, pop: 47 },
  { kw: "casino games", rank: 18, chg: 4, pop: 41 },
];
const TREND = { Installs: [12800, 13900, 13200, 15600, 16800, 18420], Conversion: [3.9, 4.1, 4.0, 4.3, 4.4, 4.6] };
const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const kfmt = (n) => (n >= 1000000 ? (n / 1000000).toFixed(1) + "m" : n >= 1000 ? (n / 1000).toFixed(0) + "k" : String(n));
const cell = { background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 12 };

export default function AsoReport({ isClient, name }) {
  const [metric, setMetric] = useState("Installs");
  const [hover, setHover] = useState(null);
  const [apps, setApps] = useState([
    { name: name || "Your app", you: true, color: "#0B0D12", data: [42, 45, 44, 50, 54, 58] },
    { name: "SportPesa", color: "#C0392B", data: [55, 54, 52, 51, 49, 48] },
    { name: "Betika", color: "#2557C7", data: [38, 40, 43, 45, 47, 50] },
  ]);
  const [newApp, setNewApp] = useState("");
  function addApp(e) { e.preventDefault(); const n = newApp.trim(); if (!n) return; const cols = ["#7C3AED", "#B4640C", "#0E8C7A", "#D6336C", "#1E7F5C"]; const base = 34 + Math.random() * 20; setApps((a) => [...a, { name: n, color: cols[a.length % cols.length], data: Array.from({ length: 6 }, (_, i) => Math.round(base + i * 2 + (Math.random() * 6 - 3))) }]); setNewApp(""); }
  function removeApp(nm) { setApps((a) => a.filter((x) => x.name !== nm)); }
  const series = TREND[metric];
  const max = Math.max(...series);
  const idx = hover != null ? hover : series.length - 1;
  const fmtVal = (v) => (metric === "Installs" ? v.toLocaleString() : v.toFixed(1) + "%");

  return (
    <>
      {/* Store performance */}
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>Store performance <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · connect App Store Connect &amp; Play Console</span> <span style={{ fontWeight: 400, color: "var(--faint)" }}>· last 30 days</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
        {[["Installs", "18,420", "▲ 9%", "#177E4E"], ["Store conversion rate", "4.6%", "▲ 0.4pt", "#177E4E"], ["Impressions", "612k", "▲ 5%", "#177E4E"], ["Product page views", "400k", "▼ 2%", "#C0392B"]].map(([k, v, d, c]) => (
          <div key={k} style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div><div style={{ fontSize: 11, color: c }}>{d}</div></div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>iOS installs</div><div style={{ fontSize: 18, fontWeight: 600 }}>10,240</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Android installs</div><div style={{ fontSize: 18, fontWeight: 600 }}>8,180</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Avg rating</div><div style={{ fontSize: 18, fontWeight: 600 }}>4.5 ★</div></div>
        <div style={cell}><div style={{ fontSize: 11, color: "var(--faint)" }}>Keywords in top 10</div><div style={{ fontSize: 18, fontWeight: 600 }}>37</div></div>
      </div>

      {/* By platform */}
      <div className="card">
        <b style={{ fontSize: 15 }}>By platform</b>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Store</th><th style={{ fontWeight: 400 }}>Impressions</th><th style={{ fontWeight: 400 }}>Page views</th><th style={{ fontWeight: 400 }}>Conversion</th><th style={{ fontWeight: 400 }}>Installs</th><th style={{ fontWeight: 400 }}>Rating</th>
            </tr></thead>
            <tbody>{PLATFORMS.map((p) => (
              <tr key={p.name} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "10px 0" }}><span style={{ width: 8, height: 8, background: p.color, borderRadius: 2, display: "inline-block", marginRight: 7 }} />{p.name}</td>
                <td>{kfmt(p.impr)}</td><td>{kfmt(p.views)}</td><td>{p.cvr.toFixed(1)}%</td><td>{p.installs.toLocaleString()}</td><td>{p.rating.toFixed(1)} ★</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Keyword rankings */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 15 }}>Keyword rankings</b><span style={{ fontSize: 11, color: "var(--faint)" }}>AppTweak later · demo</span></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Keyword</th><th style={{ fontWeight: 400 }}>Rank</th><th style={{ fontWeight: 400 }}>Change</th><th style={{ fontWeight: 400 }}>Popularity</th>
            </tr></thead>
            <tbody>{KEYWORDS.map((k) => (
              <tr key={k.kw} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "9px 0" }}>{k.kw}</td><td>{k.rank}</td>
                <td style={{ color: k.chg > 0 ? "#177E4E" : k.chg < 0 ? "#C0392B" : "var(--faint)" }}>{k.chg > 0 ? "▲ " + k.chg : k.chg < 0 ? "▼ " + Math.abs(k.chg) : "—"}</td>
                <td>{k.pop}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Trend */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b style={{ fontSize: 15 }}>Trend</b>
          <span style={{ display: "flex", gap: 6 }}>
            {["Installs", "Conversion"].map((m) => (
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
              <div style={{ width: "100%", height: h, background: active ? "#0E8C7A" : "var(--line)", borderRadius: "6px 6px 0 0", transition: "background .12s" }} />
              <span style={{ fontSize: 10, color: active ? "var(--text)" : "var(--faint)" }}>{MONTHS[i]}</span>
            </div>
          ); })}
        </div>
      </div>

      {/* Competitor apps + performance comparison (AppTweak-style) */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b style={{ fontSize: 15 }}>Competitor apps</b>
          <span className="pill p-agency">demo · connect stores</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
          {apps.map((a) => (
            <span key={a.name} className="pill" style={{ border: "0.5px solid var(--line)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: a.color, borderRadius: 2, display: "inline-block" }} />{a.name}
              {!a.you && !isClient && <span style={{ cursor: "pointer", color: "var(--faint)" }} onClick={() => removeApp(a.name)}>✕</span>}
            </span>
          ))}
        </div>
        {!isClient && (
          <form onSubmit={addApp} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input className="input" style={{ flex: 1 }} value={newApp} onChange={(e) => setNewApp(e.target.value)} placeholder="Add a competitor app (e.g. Betway)" />
            <button className="btn btn-ghost">Add</button>
          </form>
        )}

        <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 6 }}>Visibility over time</div>
        {(() => {
          const W = 640, H = 200, pad = 26;
          const vals = apps.flatMap((a) => a.data); const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
          const X = (i) => pad + i * ((W - 2 * pad) / (MONTHS.length - 1));
          const Y = (v) => H - pad - ((v - min) / ((max - min) || 1)) * (H - 2 * pad);
          return (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
              {[0, 0.5, 1].map((g, i) => { const yy = pad + g * (H - 2 * pad); return <line key={i} x1={pad} y1={yy} x2={W - pad} y2={yy} stroke="var(--line)" strokeWidth="0.5" />; })}
              {MONTHS.map((m, i) => <text key={m} x={X(i)} y={H - 6} fontSize="10" fill="var(--faint)" textAnchor="middle">{m}</text>)}
              {apps.map((a) => (
                <polyline key={a.name} fill="none" stroke={a.color} strokeWidth={a.you ? 2.5 : 1.8} points={a.data.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} />
              ))}
              {apps.map((a) => a.data.map((v, i) => <circle key={a.name + i} cx={X(i)} cy={Y(v)} r={a.you ? 3 : 2} fill={a.color} />))}
            </svg>
          );
        })()}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          {apps.map((a) => (
            <span key={a.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
              <span style={{ width: 12, height: 3, background: a.color, borderRadius: 2, display: "inline-block" }} />{a.name}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
