"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import Modal from "../../components/Modal";

const CATALOG = [
  { department: "performance", group: "Performance", items: [ { key: "paid_media", label: "Paid Media" }, { key: "seo", label: "SEO" }, { key: "aso", label: "ASO" } ] },
  { department: "content", group: "Content", items: [ { key: "creative_strategy", label: "Creative Strategy" }, { key: "asset_production", label: "Asset Production" }, { key: "ugc", label: "UGC" } ] },
  { department: "analytics", group: "Analytics", items: [ { key: "tracking", label: "Tracking" }, { key: "dashboarding", label: "Dashboarding" } ] },
];

export default function Prospects() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [show, setShow] = useState(false);
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const [flash, setFlash] = useState("");
  const [team, setTeam] = useState([]);
  const [conv, setConv] = useState(null);            // prospect being converted
  const [cLead, setCLead] = useState("");
  const [cPicked, setCPicked] = useState({});
  const [cAssign, setCAssign] = useState({});
  const [cBusy, setCBusy] = useState(false);
  const [cErr, setCErr] = useState("");

  async function token() { const { data } = await supabase.auth.getSession(); return data.session?.access_token; }
  async function load() {
    const t = await token();
    const res = await fetch("/api/prospects", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 403) { setAllowed(false); setLoading(false); return; }
    const j = await res.json(); setAllowed(true); setProspects(j.prospects || []); setLoading(false);
  }
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      if (!prof?.is_super_admin) { router.replace("/dashboard"); return; }  // super-admin only
      setProfile(prof);
      const { data: tm } = await supabase.from("profiles").select("id,full_name,email").eq("side","agency").order("full_name");
      setTeam(tm || []);
      await load(); setLoading(false);
    })();
  }, [router]);

  function openModal() { setPName(""); setPEmail(""); setErr(""); setLink(""); setShow(true); }
  async function add(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const t = await token();
    const res = await fetch("/api/prospects", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ name: pName, email: pEmail }) });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setErr(j.error || "Could not add prospect"); return; }
    setLink(j.loginLink || ""); setFlash(`Prospect "${j.client.name}" invited at ${j.invited}.`);
    load(); setTimeout(() => setFlash(""), 8000);
  }

  function openConvert(pr) { setConv(pr); setCLead(""); setCPicked({}); setCAssign({}); setCErr(""); }
  function cToggleSvc(dep, it) { setCPicked((p) => { const n = { ...p }; if (n[it.key]) { delete n[it.key]; setCAssign((a)=>{const b={...a}; delete b[it.key]; return b;}); } else n[it.key] = { department: dep, service_key: it.key, service_label: it.label }; return n; }); }
  function cToggleAssignee(sk, pid) { setCAssign((a) => { const cur = new Set(a[sk] || []); cur.has(pid) ? cur.delete(pid) : cur.add(pid); return { ...a, [sk]: [...cur] }; }); }
  async function doConvert(e) {
    e.preventDefault(); setCErr("");
    if (!cLead) { setCErr("Please choose a project lead."); return; }
    setCBusy(true);
    const teamAssignments = [];
    Object.entries(cAssign).forEach(([sk, ids]) => ids.forEach((pid) => teamAssignments.push({ profile_id: pid, service_key: sk })));
    const t = await token();
    const res = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ workspaceId: conv.id, projectLeadId: cLead, services: Object.values(cPicked), teamAssignments }) });
    const j = await res.json(); setCBusy(false);
    if (!res.ok) { setCErr(j.error || "Could not convert"); return; }
    setConv(null); setFlash(`"${j.client.name}" is now a client.`); load(); setTimeout(() => setFlash(""), 6000);
  }

  const nav = (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Dashboard</a>
        <a onClick={() => router.push("/clients")} style={{cursor:"pointer"}}>Clients</a>
        <a className="on">Prospects</a>
        <a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite teammate</a>
      </nav>
      <div className="grp">Team</div>
      <nav className="nav"><a onClick={() => router.push("/team")} style={{cursor:"pointer"}}>Team</a><a>Replays</a><a>Reports &amp; docs</a></nav>
    </>
  );

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel="Super admin" nav={nav}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Prospects</h1>
        {allowed && <button className="btn btn-primary" onClick={openModal}>+ Add prospect</button>}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>Leads doing discovery onboarding. Convert them to a client once they sign.</p>
      {flash && <div className="auth-msg auth-ok" style={{ display: "inline-block" }}>{flash}</div>}

      {!allowed ? <div className="empty">Super admins only.</div>
        : prospects.length === 0 ? <div className="empty">No prospects yet. Click "Add prospect" to invite your first lead.</div>
        : prospects.map((p) => (
          <div className="card" key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <b>{p.name}</b><span className="pill p-agency">prospect</span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 10px" }}>
              {p.discovery_complete ? "Discovery complete" : "Waiting on discovery"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={() => router.push(`/client/${p.id}`)}>Open (view as)</button>
              <button className="btn btn-primary" onClick={() => openConvert(p)}>Convert to client</button>
            </div>
          </div>
        ))}

      {show && (
        <Modal title="Add a prospect" onClose={() => setShow(false)}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            A lead who hasn't signed yet. They get a discovery onboarding only, and see our services (blurred) as a teaser. They sign in to protect their data.
          </p>
          {err && <div className="auth-msg auth-err">{err}</div>}
          {!link ? (
            <form onSubmit={add}>
              <div className="field"><label>Prospect / company name</label>
                <input className="input" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Acme Bank" required /></div>
              <div className="field"><label>Their email (gets the invite)</label>
                <input className="input" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="contact@acme.com" required /></div>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Inviting…" : "Invite prospect"}</button>
            </form>
          ) : (
            <>
              <div className="auth-msg auth-ok">Prospect invited. Share this sign-in link with them too:</div>
              <div className="field">
                <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} />
                <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => navigator.clipboard?.writeText(link)}>Copy link</button>
              </div>
              <button className="btn btn-primary" onClick={() => setShow(false)}>Done</button>
            </>
          )}
        </Modal>
      )}
      {conv && (
        <Modal title={`Convert ${conv.name} to a client`} onClose={() => setConv(null)}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>Their discovery answers stay with them. Add the services they signed for, a project lead, and the team.</p>
          {cErr && <div className="auth-msg auth-err">{cErr}</div>}
          <form onSubmit={doConvert}>
            <div className="field"><label>Project lead (agency owner) *</label>
              <select className="input" value={cLead} onChange={(e) => setCLead(e.target.value)} required>
                <option value="">Choose an agency teammate…</option>
                {team.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
            <div className="field"><label>Services they signed for</label>
              {CATALOG.map((g) => (
                <div key={g.group} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em", margin: "6px 0 4px" }}>{g.group}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {g.items.map((it) => (
                      <button type="button" key={it.key} onClick={() => cToggleSvc(g.department, it)}
                        className={"pill svc svc-" + it.key + (cPicked[it.key] ? " svc-pill" : "")}
                        style={{ border: "1px solid var(--line)", background: cPicked[it.key] ? undefined : "var(--paper)", cursor: "pointer" }}>
                        {cPicked[it.key] ? "✓ " : ""}{it.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {Object.values(cPicked).length > 0 && (
              <div className="field"><label>Assign team to each service</label>
                {Object.values(cPicked).map((s) => (
                  <div key={s.service_key} style={{ margin: "8px 0", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
                    <div className={"svc svc-" + s.service_key} style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center" }}><span className="svc-dot" />{s.service_label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {team.map((p) => {
                        const on = (cAssign[s.service_key] || []).includes(p.id);
                        return (<button type="button" key={p.id} onClick={() => cToggleAssignee(s.service_key, p.id)} className="pill" style={{ border: "1px solid var(--line)", cursor: "pointer", background: on ? "var(--bg-accent)" : "var(--paper)", color: on ? "var(--text-accent)" : "var(--text)" }}>{on ? "✓ " : ""}{p.full_name || p.email}</button>);
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" disabled={cBusy}>{cBusy ? "Converting…" : "Convert to client"}</button>
          </form>
        </Modal>
      )}

    </Shell>
  );
}
