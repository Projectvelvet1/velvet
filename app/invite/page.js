"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Invite() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("is_super_admin").eq("id", session.user.id).single();
      setAllowed(!!prof?.is_super_admin);
      setLoading(false);
    })();
  }, [router]);

  const side = email.toLowerCase().endsWith("@welcometomorrow.io") ? "Agency" : email.includes("@") ? "Client" : "";

  async function send(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ email, fullName }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ type: "err", text: j.error || "Could not send invite" }); return; }
    setMsg({ type: "ok", text: `Invite sent to ${j.email} — they'll join on the ${j.side} side.` });
    setEmail(""); setFullName("");
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="t"><img src="/mark.png" alt="" /></span><b>Velvet</b></div>
        <div className="grp">Work</div>
        <nav className="nav">
          <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Action plan</a>
          <a onClick={() => router.push("/clients")} style={{cursor:"pointer"}}>Clients</a>
          <a className="on">Invite people</a>
        </nav>
        <div className="who"><b>Invite people</b>Super admin only<br />
          <button className="signout" onClick={() => router.push("/dashboard")}>← Back to dashboard</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar"><h1 style={{ fontSize: 24 }}>Invite people</h1></div>

        {!allowed ? (
          <div className="empty">Only a super admin can invite people.</div>
        ) : (
          <div className="card" style={{ maxWidth: 520 }}>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>
              Velvet is invite-only. The person gets a secure email link to set their own password.
              Their side is decided by their email: <b>@welcometomorrow.io</b> → Agency, everyone else → Client.
            </p>
            {msg && <div className={"auth-msg " + (msg.type === "ok" ? "auth-ok" : "auth-err")}>{msg.text}</div>}
            <form onSubmit={send}>
              <div className="field">
                <label>Email to invite</label>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
                {side && <div style={{ fontSize: 12, marginTop: 6 }}>
                  Will join as <span className={"pill " + (side === "Agency" ? "p-agency" : "p-client")}>{side}</span>
                </div>}
              </div>
              <div className="field">
                <label>Their name (optional)</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
              </div>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send invite"}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
