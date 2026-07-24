"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import Modal from "../../components/Modal";

const CATALOG = [
  { department: "performance", group: "Performance", items: [
    { key: "paid_media", label: "Paid Media" }, { key: "seo", label: "SEO" }, { key: "aso", label: "ASO" } ] },
  { department: "content", group: "Content", items: [
    { key: "creative_strategy", label: "Creative Strategy" }, { key: "asset_production", label: "Asset Production" }, { key: "ugc", label: "UGC" } ] },
  { department: "analytics", group: "Analytics", items: [
    { key: "tracking", label: "Tracking" }, { key: "dashboarding", label: "Dashboarding" } ] },
];
const KEY_TO_LABEL = {}; const LABEL_BY_KEY = {};
CATALOG.forEach(g => g.items.forEach(i => { KEY_TO_LABEL[i.label] = i.key; LABEL_BY_KEY[i.key] = i.label; }));

export default function Clients() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [canAdd, setCanAdd] = useState(false);
  const [team, setTeam] = useState([]);
  const [showModal, setShowModal] = useState(false);
  // form state
  const [name, setName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [picked, setPicked] = useState({});            // service_key -> {department, service_key, service_label}
  const [projectLeadId, setProjectLeadId] = useState("");
  const [assign, setAssign] = useState({});            // service_key -> [profile_id]
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  async function token() { const { data } = await supabase.auth.getSession(); return data.session?.access_token; }
  async function load() {
    const t = await token();
    const res = await fetch("/api/clients", { headers: { Authorization: `Bearer ${t}` } });
    const j = await res.json();
    setClients(j.clients || []); setCanAdd(!!j.canAdd);
  }
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      const { data: tm } = await supabase.from("profiles").select("id,full_name,email,home_department").eq("side", "agency").order("full_name");
      setTeam(tm || []);
      await load(); setLoading(false);
    })();
  }, [router]);

  function toggleService(dep, it) {
    setPicked((p) => {
      const n = { ...p };
      if (n[it.key]) { delete n[it.key]; setAssign((a) => { const b = { ...a }; delete b[it.key]; return b; }); }
      else n[it.key] = { department: dep, service_key: it.key, service_label: it.label };
      return n;
    });
  }
  function toggleAssignee(serviceKey, pid) {
    setAssign((a) => {
      const cur = new Set(a[serviceKey] || []);
      cur.has(pid) ? cur.delete(pid) : cur.add(pid);
      return { ...a, [serviceKey]: [...cur] };
    });
  }
  function openModal() {
    setName(""); setLeadEmail(""); setLeadName(""); setPicked({}); setProjectLeadId(""); setAssign({}); setErr(""); setShowModal(true);
  }
  function teamName(p) { return p.full_name || p.email; }

  async function addClient(e) {
    e.preventDefault(); setErr("");
    if (!projectLeadId) { setErr("Please choose a project lead."); return; }
    setBusy(true);
    const teamAssignments = [];
    Object.entries(assign).forEach(([sk, ids]) => ids.forEach((pid) => teamAssignments.push({ profile_id: pid, service_key: sk })));
    const t = await token();
    const res = await fetch("/api/clients", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, leadEmail, leadName, services: Object.values(picked), projectLeadId, teamAssignments }),
    });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setErr(j.error || "Could not add client"); return; }
    setShowModal(false); setFlash(`Client "${j.client.name}" created. Invite sent to ${j.invited}.`);
    load(); setTimeout(() => setFlash(""), 6000);
  }

  const nav = (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Dashboard</a>
        <a className="on">Clients</a>
        <a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite teammate</a>
      </nav>
      <div className="grp">Team</div>
      <nav className="nav"><a onClick={() => router.push("/team")} style={{cursor:"pointer"}}>Team</a><a>Replays</a><a>Reports &amp; docs</a></nav>
    </>
  );

  const pickedServices = Object.values(picked);

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Clients</h1>
        {canAdd && <button className="btn btn-primary" onClick={openModal}>+ Add client</button>}
      </div>

      {flash && <div className="auth-msg auth-ok" style={{ display: "inline-block" }}>{flash}</div>}

      {clients.length === 0 ? (
        <div className="empty">{canAdd ? 'No clients yet. Click "Add client" to create your first.' : "You haven't been assigned to any clients yet."}</div>
      ) : clients.map((c) => (
        <div className="card" key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <b>{c.name}</b>
            {c.is_demo && <span className="pill p-agency">demo</span>}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 8px" }}>
            {c.onboarding_complete ? "Onboarding complete" : "Waiting onboarding"}
            {c.project_lead_name ? " · Lead: " + c.project_lead_name : ""}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(c.services || []).map((label) => (
              <span key={label} className={"pill svc-pill svc svc-" + (KEY_TO_LABEL[label] || "")}>{label}</span>
            ))}
            {(!c.services || c.services.length === 0) && <span style={{ fontSize: 12, color: "var(--faint)" }}>No services yet</span>}
          </div>
        </div>
      ))}

      {showModal && (
        <Modal title="Add a client" onClose={() => setShowModal(false)}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>This sends an invite to the client lead. They set a password and start onboarding.</p>
          {err && <div className="auth-msg auth-err">{err}</div>}
          <form onSubmit={addClient}>
            <div className="field"><label>Client name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Betika" required /></div>
            <div className="field"><label>Client lead email (their side, gets the invite)</label>
              <input className="input" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="lead@clientcompany.com" required /></div>
            <div className="field"><label>Client lead name (optional)</label>
              <input className="input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Full name" /></div>

            <div className="field"><label>Project lead (agency owner for this client) *</label>
              <select className="input" value={projectLeadId} onChange={(e) => setProjectLeadId(e.target.value)} required>
                <option value="">Choose an agency teammate…</option>
                {team.map((p) => <option key={p.id} value={p.id}>{teamName(p)}</option>)}
              </select>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 5 }}>Sees across all departments, can onboard the client, and pull reports.</div>
            </div>

            <div className="field"><label>Services they signed for</label>
              {CATALOG.map((g) => (
                <div key={g.group} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em", margin: "6px 0 4px" }}>{g.group}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {g.items.map((it) => (
                      <button type="button" key={it.key} onClick={() => toggleService(g.department, it)}
                        className={"pill svc svc-" + it.key + (picked[it.key] ? " svc-pill" : "")}
                        style={{ border: "1px solid var(--line)", background: picked[it.key] ? undefined : "var(--paper)", cursor: "pointer" }}>
                        {picked[it.key] ? "✓ " : ""}{it.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pickedServices.length > 0 && (
              <div className="field"><label>Assign agency team to each service</label>
                {pickedServices.map((s) => (
                  <div key={s.service_key} style={{ margin: "8px 0", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
                    <div className={"svc svc-" + s.service_key} style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center" }}>
                      <span className="svc-dot" />{s.service_label}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {team.length === 0 ? <span style={{ fontSize: 12, color: "var(--faint)" }}>No teammates yet — invite them first.</span>
                        : team.map((p) => {
                          const on = (assign[s.service_key] || []).includes(p.id);
                          return (
                            <button type="button" key={p.id} onClick={() => toggleAssignee(s.service_key, p.id)}
                              className="pill" style={{ border: "1px solid var(--line)", cursor: "pointer", background: on ? "var(--bg-accent)" : "var(--paper)", color: on ? "var(--text-accent)" : "var(--text)" }}>
                              {on ? "✓ " : ""}{teamName(p)}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create client & invite lead"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
