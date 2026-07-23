"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const SERVICES = [
  { group: "Performance", items: ["Paid Media", "SEO", "ASO"] },
  { group: "Content", items: ["Creative Strategy", "Asset Production", "UGC"] },
  { group: "Analytics", items: ["Tracking", "Dashboarding"] },
];

export default function Clients() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
  async function load() {
    const t = await token();
    const res = await fetch("/api/clients", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 403) { setAllowed(false); setLoading(false); return; }
    const j = await res.json();
    setAllowed(true); setClients(j.clients || []); setLoading(false);
  }
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      load();
    })();
  }, [router]);

  function toggle(s) { setPicked((p) => p.includes(s) ? p.filter(x => x !== s) : [...p, s]); }

  async function addClient(e) {
    e.preventDefault(); setBusy(true); setMsg("");
    const t = await token();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, services: picked }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(j.error || "Could not add client"); return; }
    setName(""); setPicked([]); setMsg("Client added.");
    load();
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="t"><img src="/mark.png" alt="" /></span><b>Velvet</b></div>
        <div className="grp">Work</div>
        <nav className="nav">
          <a onClick={() => router.push("/dashboard")} style={{cursor:"pointer"}}>Action plan</a>
          <a>My work</a>
          <a className="on">Clients</a>
        </nav>
        <div className="who"><b>Clients</b>Manage & assign<br />
          <button className="signout" onClick={() => router.push("/dashboard")}>← Back to dashboard</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar"><h1 style={{ fontSize: 24 }}>Clients</h1></div>

        {!allowed ? (
          <div className="empty">Only a super admin can add clients. Ask your admin to add you.</div>
        ) : (
          <>
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Add a client</h3>
              {msg && <div className="auth-msg auth-ok" style={{ display:"inline-block" }}>{msg}</div>}
              <form onSubmit={addClient}>
                <div className="field">
                  <label>Client name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Betika" required />
                </div>
                <div className="field">
                  <label>Services they're signed up for</label>
                  {SERVICES.map((g) => (
                    <div key={g.group} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em", margin: "6px 0 4px" }}>{g.group}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {g.items.map((s) => (
                          <button type="button" key={s} onClick={() => toggle(s)}
                            className={"pill " + (picked.includes(s) ? "p-client" : "")}
                            style={{ border: "1px solid var(--line)", background: picked.includes(s) ? undefined : "var(--paper)", cursor: "pointer" }}>
                            {picked.includes(s) ? "✓ " : ""}{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Adding…" : "Add client"}</button>
              </form>
            </div>

            <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>All clients ({clients.length})</h3>
            {clients.length === 0 ? (
              <div className="empty">No clients yet — add your first above.</div>
            ) : clients.map((c) => (
              <div className="card" key={c.id}>
                <b>{c.name}</b>{c.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                  {c.onboarding_complete ? "Onboarding complete" : "Onboarding pending"}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
