"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import Modal from "../../components/Modal";

const DEPT = { performance: "Performance", content: "Content", analytics: "Analytics" };

export default function Team() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [edit, setEdit] = useState(null); // person being edited
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await supabase
      .from("profiles").select("id,full_name,email,job_title,home_department,is_super_admin")
      .eq("side", "agency").order("full_name", { ascending: true });
    setTeam(data || []);
  }
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof); await load(); setLoading(false);
    })();
  }, [router]);

  function openEdit(p) { setErr(""); setEdit({ ...p, fullName: p.full_name || "", jobTitle: p.job_title || "", homeDepartment: p.home_department || "", isSuperAdmin: !!p.is_super_admin }); }

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/team", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ id: edit.id, fullName: edit.fullName, jobTitle: edit.jobTitle, homeDepartment: edit.homeDepartment || null, isSuperAdmin: !!edit.isSuperAdmin }),
    });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setErr(j.error || "Could not save"); return; }
    setEdit(null); load();
  }

  const nav = (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Dashboard</a>
        <a onClick={() => router.push("/clients")} style={{cursor:"pointer"}}>Clients</a>
        <a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite teammate</a>
      </nav>
      <div className="grp">Team</div>
      <nav className="nav"><a className="on">Team</a><a>Replays</a><a>Reports &amp; docs</a></nav>
    </>
  );

  if (loading) return <div className="center">Loading…</div>;
  const isAdmin = !!profile?.is_super_admin;

  return (
    <Shell profile={profile} roleLabel={isAdmin ? "Super admin" : "Team member"} nav={nav}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Team</h1>
        <button className="btn btn-ghost" onClick={() => router.push("/invite")}>+ Invite teammate</button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>Your Welcome Tomorrow team. {isAdmin ? "Click a teammate to edit their title and department." : ""}</p>

      {team.length === 0 ? <div className="empty">No teammates yet. Invite your team from the Invite screen.</div>
        : team.map((p) => (
          <div className="card" key={p.id} onClick={() => isAdmin && openEdit(p)} style={{ cursor: isAdmin ? "pointer" : "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <b>{p.full_name || "(no name yet)"}</b>
              {p.home_department && <span className="pill p-agency">{DEPT[p.home_department]}</span>}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
              {p.job_title || "No title yet"} · {p.email}{p.is_super_admin ? " · Super admin" : ""}
            </div>
          </div>
        ))}

      {edit && (
        <Modal title={`Edit ${edit.email}`} onClose={() => setEdit(null)}>
          {err && <div className="auth-msg auth-err">{err}</div>}
          <form onSubmit={save}>
            <div className="field"><label>Name</label>
              <input className="input" value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} placeholder="Full name" /></div>
            <div className="field"><label>Job title</label>
              <input className="input" value={edit.jobTitle} onChange={(e) => setEdit({ ...edit, jobTitle: e.target.value })} placeholder="e.g. SEO Lead" /></div>
            <div className="field"><label>Home department</label>
              <select className="input" value={edit.homeDepartment} onChange={(e) => setEdit({ ...edit, homeDepartment: e.target.value })}>
                <option value="">Select department…</option>
                <option value="performance">Performance</option>
                <option value="content">Content</option>
                <option value="analytics">Analytics</option>
              </select></div>
            <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="isSuperAdmin"
                checked={!!edit.isSuperAdmin}
                onChange={(e) => setEdit({ ...edit, isSuperAdmin: e.target.checked })}
              />
              <label htmlFor="isSuperAdmin" style={{ margin: 0 }}>Super admin</label>
            </div>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
