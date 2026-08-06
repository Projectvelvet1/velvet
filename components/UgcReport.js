"use client";

// UGC client report. DEMO creator-roster + per-ad performance in the SEO palette.
// Blueprint: same creative-performance view sliced by creator; client sees each
// creator's full profile INCLUDING pricing + payment (client pays creators directly).
const CREATORS = [
  { init: "J", name: "Jane Mwangi", niche: "Lifestyle · Betting", handle: "@janemwangi", reach: "128k", samples: 3, rate: "$450 / video", pay: "M-Pesa", spend: 7100, installs: 886, cpa: 8.01, grad: "linear-gradient(135deg,#4a3aa7,#7C3AED)", top: true },
  { init: "M", name: "Mike Otieno", niche: "Sports · Comedy", handle: "@mikeotieno", reach: "74k", samples: 2, rate: "$300 / video", pay: "Bank transfer", spend: 4300, installs: 402, cpa: 10.70, grad: "linear-gradient(135deg,#1b6b5a,#0E8C7A)" },
  { init: "S", name: "Sara Kim", niche: "Finance · Explainer", handle: "@sarakim", reach: "210k", samples: 4, rate: "$600 / video", pay: "PayPal", spend: 2200, installs: 240, cpa: 9.17, grad: "linear-gradient(135deg,#5a4a1b,#B4640C)" },
];
const ADS = [
  ["jane_ugc_aviator_v3", "Jane", 4200, 612, 6.90, 8.1],
  ["jane_ugc_bonus_v1", "Jane", 2900, 274, 10.58, 6.7],
  ["mike_ugc_deposit_v1", "Mike", 4300, 402, 10.70, 6.2],
  ["sara_ugc_explainer_v2", "Sara", 2200, 240, 9.17, 7.3],
];
const AI = [
  "Jane's face-to-camera hooks convert best, re-book for the next batch.",
  "Finance explainers (Sara) win on installs but cost more per video.",
  "Comedy angle (Mike) drives cheap reach but softer install intent.",
];
const money = (n) => "$" + n.toLocaleString();

export default function UgcReport({ isClient, name }) {
  return (
    <>
      {/* Creator roster (hero) */}
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>Proposed creators <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · you pay creators directly</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 6 }}>
        {CREATORS.map((c) => (
          <div key={c.name} className="card" style={{ margin: 0, padding: 0, overflow: "hidden", border: c.top ? "1px solid #177E4E" : undefined }}>
            <div style={{ padding: 14, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: c.grad, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{c.init}</div>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{c.name} {c.top && <span style={{ fontSize: 10, background: "#177E4E", color: "#fff", padding: "1px 7px", borderRadius: 20 }}>Top</span>}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{c.niche}</div></div>
            </div>
            <div style={{ padding: "0 14px 8px", fontSize: 12, color: "var(--muted)" }}>{c.handle} · {c.reach} · <span style={{ color: "#3D4EE8" }}>{c.samples} samples ↗</span></div>
            <div style={{ background: "#FBF7EE", padding: "10px 14px", fontSize: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <span style={{ color: "var(--muted)" }}>Rate <b style={{ color: "var(--ink,#0B0D12)" }}>{c.rate}</b></span>
              <span style={{ color: "var(--muted)" }}>Pay: <b style={{ color: "var(--ink,#0B0D12)" }}>{c.pay}</b></span>
            </div>
            <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 12, borderTop: "0.5px solid var(--line)" }}>
              <div><span style={{ color: "var(--faint)" }}>Spend</span><br /><b>{money(c.spend)}</b></div>
              <div><span style={{ color: "var(--faint)" }}>Installs</span><br /><b>{c.installs}</b></div>
              <div><span style={{ color: "var(--faint)" }}>CPA</span><br /><b>${c.cpa.toFixed(2)}</b></div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--faint)", margin: "0 0 14px" }}>You pay creators directly. Rate and payment method are shown so you can budget and pay.</div>

      {/* AI learnings */}
      <div style={{ background: "#FFF8E8", border: "0.5px solid #F7C948", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>✦ AI learnings</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>{AI.map((l, i) => <div key={i}>• {l}</div>)}</div>
      </div>

      {/* Per-ad performance sliced by creator */}
      <div className="card">
        <b style={{ fontSize: 15 }}>Per-ad performance</b>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Ad</th><th style={{ fontWeight: 400 }}>Creator</th><th style={{ fontWeight: 400 }}>Type</th><th style={{ fontWeight: 400 }}>Spend</th><th style={{ fontWeight: 400 }}>Installs</th><th style={{ fontWeight: 400 }}>CPA</th><th style={{ fontWeight: 400 }}>Eng.</th>
            </tr></thead>
            <tbody>{ADS.map(([ad, cr, sp, ins, cpa, eng]) => (
              <tr key={ad} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "9px 0" }}>{ad}</td><td>{cr}</td><td>UGC</td><td>{money(sp)}</td><td>{ins}</td><td>${cpa.toFixed(2)}</td><td>{eng.toFixed(1)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>Creator and type read from the naming convention (creator_adtype_angle_version).</div>
      </div>
    </>
  );
}
