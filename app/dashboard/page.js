"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import ClientView from "../../components/ClientView";
import { departmentsForRole } from "../../lib/agencyNav";
import AgencyNav from "../../components/AgencyNav";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clientWorkspace, setClientWorkspace] = useState(null);
  const [clientServices, setClientServices] = useState([]);
  const [activeClients, setActiveClients] = useState([]);
  const [depts, setDepts] = useState([]);
  const [seesAll, setSeesAll] = useState(false);

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

      // agency
      const { data: ws } = await supabase.from("workspaces")
        .select("id,name,is_demo,phase,onboarding_complete,project_lead_id").order("created_at", { ascending: true });
      const all = ws || [];
      // Dashboard = active only (signed AND onboarded)
      setActiveClients(all.filter((w) => w.phase === "signed" && w.onboarding_complete));
      const isProjectLead = all.some((w) => w.project_lead_id === uid);
      const all3 = !!p.is_super_admin || isProjectLead;
      setSeesAll(all3);
      const { data: assigns } = await supabase.from("service_assignments").select("service_key").eq("profile_id", uid);
      const assignedServiceKeys = new Set((assigns || []).map((a) => a.service_key));
      setDepts(departmentsForRole({ seesAll: all3, assignedServiceKeys }));
      setLoading(false);
    })();
  }, [router]);

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
        <h1 style={{ fontSize: 24 }}>Welcome back, {firstName}</h1>
        <span className="pill p-agency">Agency side</span>
      </div>
      <div className="card"><b>You're signed in.</b>
        <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>
          This is your active work: clients who are onboarded and being served. Signed clients still onboarding are under Clients.
        </p>
      </div>
      <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Active clients</h3>
      {activeClients.length === 0 ? (
        <div className="empty">No active clients yet. Clients appear here once their onboarding is complete.</div>
      ) : activeClients.map((w) => (
        <div className="card" key={w.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/client/${w.id}`)}>
          <b>{w.name}</b>{w.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Active · onboarding complete</div>
        </div>
      ))}
    </Shell>
  );
}
