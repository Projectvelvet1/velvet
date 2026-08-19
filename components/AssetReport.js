"use client";
import { useState } from "react";
import Modal from "./Modal";
import { notify } from "../lib/notify";

// Asset Production client report. DEMO production pipeline in the SEO palette.
// Each stage shows max 2 cards; "View all" opens a modal with This week /
// This month / This quarter filters (quarter picks year + Q1-Q4).
const TYPE_TAG = { Static: { bg: "#EEE9F7", fg: "#5B2E9E" }, Motion: { bg: "#E7F0FB", fg: "#1E5BB8" }, UGC: { bg: "#FBE9F1", fg: "#A01E58" } };
const now = new Date();
const dt = (off) => { const d = new Date(now); d.setDate(d.getDate() + off); return d; };
const STAGES = [
  { key: "Requested", verb: "due", items: [
    { type: "Static", name: "Diwali promo pack (5)", owner: "Grace", date: dt(8) },
    { type: "Motion", name: "App tutorial 15s", owner: "Sam", date: dt(14) },
    { type: "Static", name: "Referral banners", owner: "Grace", date: dt(40) },
    { type: "UGC", name: "Creator brief batch 3", owner: "Jane", date: dt(-6) },
  ] },
  { key: "In production", verb: "due", items: [
    { type: "UGC", name: "Jane aviator hook v4", owner: "Jane", date: dt(6) },
    { type: "Static", name: "Odds banners set", owner: "Grace", date: dt(5) },
    { type: "Motion", name: "Jackpot reveal anim", owner: "Sam", date: dt(-1), overdue: true },
    { type: "UGC", name: "Mike comedy skit v2", owner: "Mike", date: dt(3) },
    { type: "Static", name: "Deposit flow statics", owner: "Grace", date: dt(9) },
    { type: "Motion", name: "Onboarding loop", owner: "Sam", date: dt(-20) },
  ] },
  { key: "In review", verb: "sent", items: [
    { type: "UGC", name: "Mike deposit v2", owner: "Mike", date: dt(0) },
    { type: "Static", name: "Welcome bonus creatives", owner: "Grace", date: dt(-1) },
    { type: "Motion", name: "Brand sting v3", owner: "Sam", date: dt(-8) },
  ] },
  { key: "Delivered", verb: "delivered", items: [
    { type: "UGC", name: "Sara explainer v2", owner: "Sara", date: dt(-3), done: true },
    { type: "Static", name: "Ramadan set (8)", owner: "Grace", date: dt(-5), done: true },
    { type: "Motion", name: "Brand intro motion v1", owner: "Sam", date: dt(-9), done: true },
    { type: "Static", name: "Launch teaser set", owner: "Grace", date: dt(-20), done: true },
    { type: "UGC", name: "Jane bonus v1", owner: "Jane", date: dt(-40), done: true },
  ] },
];

const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const qOf = (d) => Math.floor(d.getMonth() / 3) + 1;
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
const inWeek = (d) => { const s = startOfWeek(now); const e = new Date(s); e.setDate(s.getDate() + 7); return d >= s && d < e; };
const inMonth = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
const inQuarter = (d, y, qq) => d.getFullYear() === y && qOf(d) === qq;

function Tag({ t }) { const c = TYPE_TAG[t] || { bg: "#EEF0F3", fg: "#3C4657" }; return <span style={{ fontSize: 10, background: c.bg, color: c.fg, padding: "1px 7px", borderRadius: 20 }}>{t}</span>; }
function metaLine(st, it) {
  if (st.key === "In review") return `with client · sent ${fmt(it.date)}`;
  if (st.key === "Delivered") return `✓ delivered ${fmt(it.date)}`;
  return `Owner: ${it.owner} · ${it.overdue ? "overdue " : "due "}${fmt(it.date)}`;
}

export default function AssetReport({ isClient, name }) {
  const [open, setOpen] = useState(null);       // stage object or null
  const [period, setPeriod] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(qOf(now));

  const openStage = (st) => { setOpen(st); setPeriod("month"); setYear(now.getFullYear()); setQuarter(qOf(now)); };
  const [stages, setStages] = useState(() => STAGES.map((s) => ({ ...s, items: s.items.map((it, i) => ({ ...it, id: `${s.key}-${i}` })) })));
  const [reviewFor, setReviewFor] = useState(null);
  const [reason, setReason] = useState("");
  function moveItem(id, action, reasonText) {
    setStages((prev) => {
      let moved = null;
      const cleared = prev.map((s) => ({ ...s, items: s.items.filter((it) => { if (it.id === id) { moved = it; return false; } return true; }) }));
      if (!moved) return prev;
      const targetKey = action === "approve" ? "Delivered" : "In production";
      const newItem = action === "approve" ? { ...moved, done: true, overdue: false, date: new Date() } : { ...moved, overdue: true, done: false, note: reasonText, date: new Date() };
      return cleared.map((s) => s.key === targetKey ? { ...s, items: action === "approve" ? [newItem, ...s.items] : [...s.items, newItem] } : s);
    });
  }
  const deliveredStage = stages.find((s) => s.key === "Delivered") || { items: [] };
  const filtered = open ? open.items.filter((it) => period === "week" ? inWeek(it.date) : period === "month" ? inMonth(it.date) : inQuarter(it.date, year, quarter)) : [];
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <>
      {/* Summary */}
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>Production status <span className="pill p-agency" style={{ marginLeft: 4 }}>demo</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[["In production", String((stages.find((s) => s.key === "In production") || { items: [] }).items.length), "var(--ink,#0B0D12)"], ["In review", String((stages.find((s) => s.key === "In review") || { items: [] }).items.length), "#B4640C"], ["Delivered", String(deliveredStage.items.length), "#177E4E"], ["Overdue", String(stages.reduce((n, s) => n + s.items.filter((it) => it.overdue).length, 0)), "#C0392B"]].map(([k, v, c]) => (
          <div key={k} style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 12, padding: 13 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 22, fontWeight: 600, color: c }}>{v}</div></div>
        ))}
      </div>

      {/* Pipeline — max 2 cards per column + View all */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {stages.map((st) => (
          <div key={st.key}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, paddingLeft: 2 }}>{st.key} <span style={{ color: "var(--faint)" }}>{st.items.length}</span></div>
            {st.items.slice(0, 2).map((it) => (
              <div key={it.id} className="card" style={{ margin: "0 0 8px", padding: 11, border: it.overdue ? "1px solid #C0392B" : undefined, opacity: it.done ? 0.85 : 1 }}>
                <Tag t={it.type} />
                <div style={{ fontSize: 13, color: "var(--ink,#0B0D12)", marginTop: 6 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: it.overdue ? "#C0392B" : it.done ? "#177E4E" : "var(--faint)", marginTop: 4 }}>{metaLine(st, it)}</div>
                {st.key === "In review" && isClient && (
                  reviewFor === it.id ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea className="input" rows={2} placeholder="What needs another look? (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { setReviewFor(null); setReason(""); }}>Cancel</button>
                        <button className="btn btn-primary" style={{ padding: "5px 10px", fontSize: 12 }} disabled={!reason.trim()} onClick={() => { moveItem(it.id, "sendback", reason.trim()); notify({ type: "review_sent_back", text: `Sent back: ${it.name}`, meta: { item: it.id } }); setReviewFor(null); setReason(""); }}>Send back</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button className="btn btn-primary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { moveItem(it.id, "approve"); notify({ type: "review_approved", text: `Approved: ${it.name}`, meta: { item: it.id } }); }}>Approve</button>
                      <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setReviewFor(it.id)}>Send back</button>
                    </div>
                  )
                )}
              </div>
            ))}
            <button className="btn btn-ghost" style={{ width: "100%", fontSize: 12, padding: "7px 0" }} onClick={() => openStage(st)}>View all ({st.items.length})</button>
          </div>
        ))}
      </div>

      {/* Recently delivered */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 15 }}>Recently delivered</b><span style={{ fontSize: 11, color: "var(--faint)" }}>auto-filed in Documents</span></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 400 }}>Asset</th><th style={{ fontWeight: 400 }}>Type</th><th style={{ fontWeight: 400 }}>Owner</th><th style={{ fontWeight: 400 }}>Delivered</th><th style={{ fontWeight: 400 }}></th>
            </tr></thead>
            <tbody>{deliveredStage.items.slice(0, 3).map((it) => (
              <tr key={it.id} style={{ borderTop: "0.5px solid var(--line)" }}>
                <td style={{ padding: "9px 0" }}>{it.name}</td><td>{it.type}</td><td>{it.owner}</td><td>{fmt(it.date)}</td><td style={{ color: "#3D4EE8" }}>Open ↗</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* View-all modal with time filters */}
      {open && (
        <Modal title={`${open.key} — all assets`} onClose={() => setOpen(null)}>
          <div style={{ padding: "4px 4px 8px" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {[["week", "This week"], ["month", "This month"], ["quarter", "This quarter"]].map(([v, l]) => (
                <button key={v} onClick={() => setPeriod(v)} className="btn" style={{ padding: "5px 13px", fontSize: 12, borderRadius: 20, background: period === v ? "#0B0D12" : "transparent", color: period === v ? "#fff" : "var(--muted)", border: period === v ? "none" : "0.5px solid var(--line)" }}>{l}</button>
              ))}
              {period === "quarter" && (
                <span style={{ display: "flex", gap: 6, marginLeft: 4 }}>
                  <select className="input" style={{ width: "auto", padding: "5px 10px", fontSize: 12 }} value={year} onChange={(e) => setYear(+e.target.value)}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                  <select className="input" style={{ width: "auto", padding: "5px 10px", fontSize: 12 }} value={quarter} onChange={(e) => setQuarter(+e.target.value)}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}</select>
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 8 }}>
              {period === "quarter" ? `Q${quarter} ${year}` : period === "month" ? "This month" : "This week"} · {filtered.length} {filtered.length === 1 ? "asset" : "assets"}
            </div>
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted)", padding: "10px 0" }}>No assets in this period.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
                  <th style={{ padding: "6px 0", fontWeight: 400 }}>Asset</th><th style={{ fontWeight: 400 }}>Type</th><th style={{ fontWeight: 400 }}>Owner</th><th style={{ fontWeight: 400 }}>{open.verb === "delivered" ? "Delivered" : open.verb === "sent" ? "Sent" : "Due"}</th>
                </tr></thead>
                <tbody>{filtered.map((it) => (
                  <tr key={it.name} style={{ borderTop: "0.5px solid var(--line)" }}>
                    <td style={{ padding: "9px 0" }}>{it.name}</td><td><Tag t={it.type} /></td><td>{it.owner}</td>
                    <td style={{ color: it.overdue ? "#C0392B" : "var(--muted)" }}>{fmt(it.date)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
