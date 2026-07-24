"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import Modal from "../../components/Modal";

export default function Invite() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [homeDepartment, setHomeDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,is_super_admin").eq("id", session.user.id).single();
      setProfile(prof); setAllowed(!!prof?.is_super_admin); setLoading(false);
    })();
  }, [router]);

  function openModal() { setEmail(""); setFullName(""); setJobTitle(""); setHomeDepartment(""); setErr(""); setShow(true); }

  async function send(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/invite", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ email, fullName, jobTitle, homeDepartment: homeDepartment || null }),
    });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setErr(j.error || "Could not send invite"); return; }
    setShow(false); setFlash(`Invite sent to ${j.email}.`); setTimeout(() => setFlash(""), 6000);
  }

  const nav = (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Dashboard</a>
        <a onClick={() => router.push("/clients")} style={{cursor:"pointer"}}>Clients</a>
        <a className="on">Invite teammate</a>
      </nav>
    </>
  );

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Invite a teammate</h1>
        {allowed && <button className="btn btn-primary" onClick={openModal}>+ Invite teammate</button>}
      </div>

      {flash && <div className="auth-msg auth-ok" style={{ display: "inline-block" }}>{flash}</div>}

      {!allowed ? (
        <div className="empty">Only a super admin can invite teammates.</div>
      ) : (
        <div className="card">
          <b>Agency teammates only</b>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "6px 0 0" }}>
            Invite Welcome Tomorrow team members (@welcometomorrow.io). They set their own password and join the agency side.
            To add a client, use the Clients screen instead.
          </p>
        </div>
      )}

      {show && (
        <Modal title="Invite a teammate" onClose={() => setShow(false)}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            They get a secure email link to set their own password. Agency teammates only (@welcometomorrow.io).
          </p>
          {err && <div className="auth-msg auth-err">{err}</div>}
          <form onSubmit={send}>
            <div className="field"><label>Email to invite</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@welcometomorrow.io" /></div>
            <div className="field"><label>Their name (optional)</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" /></div>
            <div className="field"><label>Job title</label>
              <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Paid Media Specialist" /></div>
            <div className="field"><label>Home department</label>
              <select className="input" value={homeDepartment} onChange={(e) => setHomeDepartment(e.target.value)}>
                <option value="">Select department…</option>
                <option value="performance">Performance</option>
                <option value="content">Content</option>
                <option value="analytics">Analytics</option>
              </select></div>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send invite"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
