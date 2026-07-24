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
const KEY_TO_LABEL = {}; CATALOG.forEach(g => g.items.forEach(i => KEY_TO_LABEL[i.label] = i.key));

export default function Clients() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  async function token() { const { data } = await supabase.auth.getSession(); return data.session?.access_token; }
  async function load() {
    const t = await token();
    const res = await fetch("/api/clients", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 403) { setAllowed(false); setLoading(false); return; }
    const j = await res.json(); setAllowed(true); setClients(j.clients || []); setLoading(false);
  }
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,is_super_admin").eq("id", session.user.id).single();
      setProfile(prof); load();
    })();
  }, [router]);

  function toggle(dep, it) {
    setPicked((p) => { const n = { ...p }; if (n[it.key]) delete n[it.key]; else n[it.key] = { department: dep, service_key: it.key, service_label: it.label }; return n; });
  }
  function openModal() { setName(""); setLeadEmail(""); setLeadName(""); setPicked({}); setErr(""); setShowModal(true); }

  async function addClient(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const t = await token();
    const res = await fetch("/api/clients", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, leadEmail, leadName, services: Object.values(picked) }),
    });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setErr(j.error || "Could not add client"); return; }
    setShowModal(false);
    setFlash(`Client "${j.client.name}" created. Invite sent to ${j.invited}.`);
    load();
    setTimeout(() => setFlash(""), 6000);
  }

  const nav = (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Dashboard</a>
        <a className="on">Clients</a>
        <a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite teammate</a>
      </nav>
    </>
  );

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Clients</h1>
        {allowed && <button className="btn btn-primary" onClick={openModal}>+ Add client</button>}
      </div>

      {flash && <div className="auth-msg auth-ok" style={{ display: "inline-block" }}>{flash}</div>}

      {!allowed ? (
        <div className="empty">Only a super admin can create clients.</div>
      ) : clients.length === 0 ? (
        <div className="empty">No clients yet. Click "Add client" to create your first.</div>
      ) : clients.map((c) => (
        <div className="card" key={c.id}>
          <b>{c.name}</b>{c.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
          <div style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 8px" }}>
            {c.onboarding_complete ? "Onboarding complete" : "Waiting onboarding"}
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
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            This sends an invite to the client lead. They set a password and start onboarding.
          </p>
          {err && <div className="auth-msg auth-err">{err}</div>}
          <form onSubmit={addClient}>
            <div className="field"><label>Client name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Betika" required /></div>
            <div className="field"><label>Client lead email (gets the invite)</label>
              <input className="input" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="lead@clientcompany.com" required /></div>
            <div className="field"><label>Client lead name (optional)</label>
              <input className="input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Full name" /></div>
            <div className="field"><label>Services they signed for</label>
              {CATALOG.map((g) => (
                <div key={g.group} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em", margin: "6px 0 4px" }}>{g.group}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {g.items.map((it) => (
                      <button type="button" key={it.key} onClick={() => toggle(g.department, it)}
                        className={"pill svc svc-" + it.key + (picked[it.key] ? " svc-pill" : "")}
                        style={{ border: "1px solid var(--line)", background: picked[it.key] ? undefined : "var(--paper)", cursor: "pointer" }}>
                        {picked[it.key] ? "✓ " : ""}{it.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="field"><label>Assign agency team by service</label>
              <div style={{ fontSize: 13, color: "var(--faint)", padding: "10px 12px", border: "1px dashed var(--line)", borderRadius: "var(--r-sm)" }}>
                Coming next: pick which agency teammate handles each service. Available once your team members are invited.
              </div></div>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create client & invite lead"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
