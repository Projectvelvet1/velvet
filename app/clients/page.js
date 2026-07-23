"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const CATALOG = [
  { department: "performance", group: "Performance", items: [
    { key: "paid_media", label: "Paid Media" }, { key: "seo", label: "SEO" }, { key: "aso", label: "ASO" } ] },
  { department: "content", group: "Content", items: [
    { key: "creative_strategy", label: "Creative Strategy" }, { key: "asset_production", label: "Asset Production" }, { key: "ugc", label: "UGC" } ] },
  { department: "analytics", group: "Analytics", items: [
    { key: "tracking", label: "Tracking" }, { key: "dashboarding", label: "Dashboarding" } ] },
];

export default function Clients() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [picked, setPicked] = useState({}); // key -> {department, service_key, service_label}
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function token() { const { data } = await supabase.auth.getSession(); return data.session?.access_token; }
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

  function toggle(dep, it) {
    setPicked((p) => {
      const n = { ...p };
      if (n[it.key]) delete n[it.key];
      else n[it.key] = { department: dep, service_key: it.key, service_label: it.label };
      return n;
    });
  }

  async function addClient(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const t = await token();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, leadEmail, leadName, services: Object.values(picked) }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ type: "err", text: j.error || "Could not add client" }); return; }
    setMsg({ type: "ok", text: `Client "${j.client.name}" created. Invite sent to ${j.invited}.` });
    setName(""); setLeadEmail(""); setLeadName(""); setPicked({});
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
          <a className="on">Clients</a>
          <a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite teammate</a>
        </nav>
        <div className="who"><b>Clients</b>Create & view<br />
          <button className="signout" onClick={() => router.push("/dashboard")}>← Back to dashboard</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar"><h1 style={{ fontSize: 24 }}>Clients</h1></div>

        {!allowed ? (
          <div className="empty">Only a super admin can create clients.</div>
        ) : (
          <>
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Add a client</h3>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
                Creating a client sends an invite to the client lead. They set a password and start onboarding.
              </p>
              {msg && <div className={"auth-msg " + (msg.type === "ok" ? "auth-ok" : "auth-err")} style={{ display: "inline-block" }}>{msg.text}</div>}
              <form onSubmit={addClient}>
                <div className="field">
                  <label>Client name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Betika" required />
                </div>
                <div className="field">
                  <label>Client lead email (gets the invite)</label>
                  <input className="input" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="lead@clientcompany.com" required />
                </div>
                <div className="field">
                  <label>Client lead name (optional)</label>
                  <input className="input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="field">
                  <label>Services they signed for</label>
                  {CATALOG.map((g) => (
                    <div key={g.group} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em", margin: "6px 0 4px" }}>{g.group}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {g.items.map((it) => (
                          <button type="button" key={it.key} onClick={() => toggle(g.department, it)}
                            className={"pill " + (picked[it.key] ? "p-client" : "")}
                            style={{ border: "1px solid var(--line)", background: picked[it.key] ? undefined : "var(--paper)", cursor: "pointer" }}>
                            {picked[it.key] ? "✓ " : ""}{it.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="field">
                  <label>Assign agency team by service</label>
                  <div style={{ fontSize: 13, color: "var(--faint)", padding: "10px 12px", border: "1px dashed var(--line)", borderRadius: "var(--r-sm)" }}>
                    Coming next: pick which agency teammate handles each service for this client.
                    Available once your agency team members have been invited.
                  </div>
                </div>

                <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create client & invite lead"}</button>
              </form>
            </div>

            <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>All clients ({clients.length})</h3>
            {clients.length === 0 ? (
              <div className="empty">No clients yet — add your first above.</div>
            ) : clients.map((c) => (
              <div className="card" key={c.id}>
                <b>{c.name}</b>{c.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                  {c.onboarding_complete ? "Onboarding complete" : "Waiting onboarding"}
                  {c.services?.length ? " · " + c.services.join(", ") : " · no services yet"}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
