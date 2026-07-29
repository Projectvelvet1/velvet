"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import ClientView from "../../components/ClientView";
import Modal from "../../components/Modal";
import { departmentsForRole } from "../../lib/agencyNav";
import AgencyNav from "../../components/AgencyNav";

const HEALTH = { healthy: { label: "Healthy", bg: "#E4F6EC", fg: "#177E4E" }, watch: { label: "To watch", bg: "#FDEBD3", fg: "#B4640C" }, risk: { label: "At risk", bg: "#FBEAE6", fg: "#C0392B" } };
const DEPT_COLOR = { Performance: "#C0392B", Content: "#7C3AED", Analytics: "#1E7F5C" };

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clientWorkspace, setClientWorkspace] = useState(null);
  const [clientServices, setClientServices] = useState([]);
  const [activeClients, setActiveClients] = useState([]);
  const [richClients, setRichClients] = useState([]);
  const [depts, setDepts] = useState([]);
  const [seesAll, setSeesAll] = useState(false);
  const [editMeta, setEditMeta] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", uid).single();
      const p = prof || { email: session.user.email, side: "agency" };
      setProfile(p);

      if (p.side === "client") {
        const { data: ws } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,discovery_complete").limit(1);
        const w = ws?.[0] || null; setClientWorkspace(w);
        if (w && w.phase !== "prospect") {
          const { data: svc } = await supabase.from("client_services").select("department,service_label,service_key").eq("workspace_id", w.id);
          setClientServices(svc || []);
        }
        setLoading(false); return;
      }

      const { data: ws } = await supabase.from("workspaces")
        .select("id,name,is_demo,phase,onboarding_complete,project_lead_id").order("created_at", { ascending: true });
      const all = ws || [];
      setActiveClients(all.filter((w) => w.phase === "signed" && w.onboarding_complete));
      const isProjectLead = all.some((w) => w.project_lead_id === uid);
      const all3 = !!p.is_super_admin || isProjectLead;
      setSeesAll(all3);
      const { data: assigns } = await supabase.from("service_assignments").select("service_key").eq("profile_id", uid);
      const assignedServiceKeys = new Set((assigns || []).map((a) => a.service_key));
      setDepts(departmentsForRole({ seesAll: all3, assignedServiceKeys }));

      if (all3) {
        const res = await fetch("/api/dashboard-clients", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { const j = await res.json(); setRichClients(j.clients || []); }
      }
      setLoading(false);
    })();
  }, [router]);

  function openMeta(c) { setEditMeta({ id: c.id, name: c.name, health: c.health || "healthy", upsell: c.upsell || "", notes: c.notes || "" }); }
  async function saveMeta(e) {
    e.preventDefault(); setBusy(true);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/client-details", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ workspaceId: editMeta.id, health: editMeta.health, upsell: editMeta.upsell, notes: editMeta.notes }) });
    setBusy(false);
    if (res.ok) { setRichClients((cs) => cs.map((c) => c.id === editMeta.id ? { ...c, health: editMeta.health, upsell: editMeta.upsell, notes: editMeta.notes } : c)); setEditMeta(null); }
  }

  if (loading) return <div className="center">Loading your workspace…</div>;

  const isAgency = profile?.side === "agency";
  if (!isAgency) {
    if (!clientWorkspace) return <div className="center">Your account is being set up. Please check back shortly.</div>;
    return <ClientView workspace={clientWorkspace} services={clientServices} profile={profile} />;
  }

  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0].split("@")[0];
  const roleLabel = profile?.is_super_admin ? "Super admin" : "Team member";
  const nav = <AgencyNav profile={profile} active="dashboard" depts={depts} />;

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Active clients</h1>
        <span className="pill p-agency">{roleLabel}</span>
      </div>

      {seesAll ? (
        richClients.length === 0 ? <div className="empty">No active clients yet. Clients appear here once their onboarding is complete.</div>
        : richClients.map((c) => {
          const h = HEALTH[c.health] || HEALTH.healthy;
          return (
            <div className="card" key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div><b style={{ fontSize: 16 }}>{c.name}</b>{c.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
                  <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{[c.industry, c.website, c.start_date ? "since " + c.start_date : null].filter(Boolean).join(" · ") || "No details yet"}</div></div>
                <span className="pill" style={{ background: h.bg, color: h.fg }}>{h.label}</span>
              </div>

              {c.services.length > 0 && <>
                <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 5 }}>Services</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {c.services.map((s) => <span key={s} className="pill p-agency">{s}</span>)}
                </div>
              </>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ background: "var(--cloud, #F5F6F8)", borderRadius: 10, padding: 11 }}>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 6 }}>Team by department</div>
                  {c.team.length === 0 ? <div style={{ fontSize: 12, color: "var(--faint)" }}>No one assigned yet</div>
                    : c.team.map((d) => <div key={d.dept} style={{ fontSize: 12, marginBottom: 3 }}><b style={{ color: DEPT_COLOR[d.dept] || "var(--text)" }}>{d.dept}</b> · {d.members.join(", ")}</div>)}
                </div>
                <div style={{ background: "var(--cloud, #F5F6F8)", borderRadius: 10, padding: 11 }}>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 6 }}>Latest feedback</div>
                  {c.feedback ? <><div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 22, fontWeight: 600 }}>{c.feedback.overall ?? "—"}</span><span style={{ fontSize: 11, color: "var(--faint)" }}>/10 overall</span></div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{new Date(c.feedback.date).toLocaleDateString()} · <span style={{ color: "#2557C7", cursor: "pointer" }} onClick={() => router.push("/feedback")}>View history</span></div></>
                    : <div style={{ fontSize: 12, color: "var(--faint)" }}>None yet</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ border: "0.5px solid #F0D9A6", background: "#FEFBF2", borderRadius: 10, padding: 11 }}>
                  <div style={{ fontSize: 11, color: "#9A6B00", marginBottom: 5 }}>Upsell opportunities</div>
                  <div style={{ fontSize: 12, color: c.upsell ? "var(--text)" : "var(--faint)" }}>{c.upsell || "None noted"}</div>
                </div>
                <div style={{ border: "0.5px solid var(--line)", borderRadius: 10, padding: 11 }}>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 5 }}>Notes</div>
                  <div style={{ fontSize: 12, color: c.notes ? "var(--text)" : "var(--faint)" }}>{c.notes || "No notes"}</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                {c.canEditMeta && <button className="btn btn-ghost" onClick={() => openMeta(c)}>Edit health / upsell / notes</button>}
                <button className="btn btn-primary" onClick={() => router.push(`/client/${c.id}`)}>Open client →</button>
              </div>
            </div>
          );
        })
      ) : (
        activeClients.length === 0 ? <div className="empty">No active clients yet. Clients appear here once their onboarding is complete.</div>
        : activeClients.map((w) => (
          <div className="card" key={w.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/client/${w.id}`)}>
            <b>{w.name}</b>{w.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Active · onboarding complete</div>
          </div>
        ))
      )}

      {editMeta && (
        <Modal title={`Edit ${editMeta.name}`} onClose={() => setEditMeta(null)}>
          <form onSubmit={saveMeta}>
            <div className="field"><label>Health status</label>
              <select className="input" value={editMeta.health} onChange={(e) => setEditMeta({ ...editMeta, health: e.target.value })}>
                <option value="healthy">Healthy</option><option value="watch">To watch</option><option value="risk">At risk</option>
              </select></div>
            <div className="field"><label>Upsell opportunities</label>
              <textarea className="input" rows={2} value={editMeta.upsell} onChange={(e) => setEditMeta({ ...editMeta, upsell: e.target.value })} placeholder="e.g. Creative Strategy retainer" /></div>
            <div className="field"><label>Notes</label>
              <textarea className="input" rows={3} value={editMeta.notes} onChange={(e) => setEditMeta({ ...editMeta, notes: e.target.value })} placeholder="Internal notes about this client" /></div>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
