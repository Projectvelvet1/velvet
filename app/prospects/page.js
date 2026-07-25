"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import Modal from "../../components/Modal";

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
      setProfile(prof); await load(); setLoading(false);
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
              <button className="btn btn-ghost" disabled title="Coming next">Convert to client</button>
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
    </Shell>
  );
}
