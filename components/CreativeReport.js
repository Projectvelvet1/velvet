"use client";
import { useState } from "react";

// Creative Strategy client report. DEMO gallery + comparison in the SEO palette,
// until Atria + Adshore (installs from the app measurement partner) are connected.
// Blueprint: compare creatives side by side, spend/installs per creative,
// engagement, AI learnings; type + creator read from the naming convention.
const CREATIVES = [
  { name: "jane_ugc_aviator_v3", type: "UGC", creator: "Jane", spend: 4200, installs: 612, cpa: 6.90, eng: 8.1, grad: "linear-gradient(135deg,#2b2f5a,#4a3aa7)", tag: "top" },
  { name: "promo_static_jackpot_a", type: "Static", creator: "In-house", spend: 3100, installs: 318, cpa: 9.75, eng: 3.4, grad: "linear-gradient(135deg,#7a2b2b,#c0392b)" },
  { name: "mike_ugc_deposit_v1", type: "UGC", creator: "Mike", spend: 2900, installs: 274, cpa: 10.58, eng: 6.7, grad: "linear-gradient(135deg,#1b6b5a,#0E8C7A)" },
  { name: "motion_brand_intro_v2", type: "Motion", creator: "In-house", spend: 2600, installs: 96, cpa: 27.10, eng: 9.2, grad: "linear-gradient(135deg,#3a2f5a,#7C3AED)", tag: "under" },
  { name: "sara_ugc_bonus_v2", type: "UGC", creator: "Sara", spend: 2200, installs: 240, cpa: 9.17, eng: 7.3, grad: "linear-gradient(135deg,#5a4a1b,#B4640C)" },
  { name: "static_odds_promo_b", type: "Static", creator: "In-house", spend: 1500, installs: 121, cpa: 12.40, eng: 3.0, grad: "linear-gradient(135deg,#1b3a5a,#2557C7)" },
];
const AI = [
  "UGC hooks with a face in the first 2s drive 34% lower CPA than statics.",
  "The \u201CAviator win\u201D angle is your top installs driver, scale it.",
  "Motion ads have high engagement but weak installs, reframe the CTA.",
];
const money = (n) => "$" + n.toLocaleString();

export default function CreativeReport({ isClient, name }) {
  const [filter, setFilter] = useState("All");
  const shown = CREATIVES.filter((c) => filter === "All" || c.type === filter);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, margin: "16px 0 8px" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Creative performance <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · connect Atria + Adshore</span></span>
        <span style={{ display: "flex", gap: 6 }}>
          {["All", "Static", "UGC", "Motion"].map((t) => (
            <button key={t} onClick={() => setFilter(t)} className="btn" style={{ padding: "4px 12px", fontSize: 12, borderRadius: 20, background: filter === t ? "#0B0D12" : "transparent", color: filter === t ? "#fff" : "var(--muted)", border: filter === t ? "none" : "0.5px solid var(--line)" }}>{t}</button>
          ))}
        </span>
      </div>

      {/* AI learnings */}
      <div style={{ background: "#FFF8E8", border: "0.5px solid #F7C948", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>✦ AI learnings</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>{AI.map((l, i) => <div key={i}>• {l}</div>)}</div>
      </div>

      {/* Gallery of creative cards (hero) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 }}>
        {shown.map((c) => (
          <div key={c.name} className="card" style={{ margin: 0, padding: 0, overflow: "hidden", border: c.tag === "top" ? "1px solid #177E4E" : c.tag === "under" ? "1px solid #C0392B" : undefined }}>
            <div style={{ height: 118, background: c.grad, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ opacity: 0.5, fontSize: 12, color: "#fff" }}>creative preview</span>
              {c.tag && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, background: c.tag === "top" ? "#177E4E" : "#C0392B", color: "#fff", padding: "2px 8px", borderRadius: 20 }}>{c.tag === "top" ? "Top performer" : "Underperformer"}</span>}
              <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, background: "rgba(0,0,0,.5)", color: "#fff", padding: "2px 8px", borderRadius: 20 }}>{c.type}</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>by {c.creator}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 12 }}>
                <div><span style={{ color: "var(--faint)" }}>Spend</span><br /><b>{money(c.spend)}</b></div>
                <div><span style={{ color: "var(--faint)" }}>Installs</span><br /><b>{c.installs}</b></div>
                <div><span style={{ color: "var(--faint)" }}>CPA</span><br /><b>${c.cpa.toFixed(2)}</b></div>
                <div><span style={{ color: "var(--faint)" }}>Engagement</span><br /><b>{c.eng.toFixed(1)}%</b></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compact comparison table */}
      <div className="card">
        <b style={{ fontSize: 15 }}>All creatives</b>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Creative</th><th style={{ fontWeight: 400 }}>Type</th><th style={{ fontWeight: 400 }}>Creator</th><th style={{ fontWeight: 400 }}>Spend</th><th style={{ fontWeight: 400 }}>Installs</th><th style={{ fontWeight: 400 }}>CPA</th><th style={{ fontWeight: 400 }}>Eng.</th>
            </tr></thead>
            <tbody>{shown.map((c) => (
              <tr key={c.name} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "9px 0" }}>{c.name}</td><td>{c.type}</td><td>{c.creator}</td><td>{money(c.spend)}</td><td>{c.installs}</td><td>${c.cpa.toFixed(2)}</td><td>{c.eng.toFixed(1)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>Type and creator read from the naming convention (creator_adtype_angle_version). Statics and motion are in-house unless a creator is named.</div>
      </div>
    </>
  );
}
