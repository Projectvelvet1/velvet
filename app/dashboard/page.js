"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ClientView from "../../components/ClientView";

// Router: clients see their portal here; agency users are sent to Overview (super
// admin / project lead) or My Work (team member). Keeps the post-login entry working.
export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clientWorkspace, setClientWorkspace] = useState(null);
  const [clientServices, setClientServices] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", uid).single();
      const p = prof || { id: uid, email: session.user.email, side: "agency" };
      setProfile(p);

      if (p.side === "client") {
        const { data: ws } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,discovery_complete,kpi_label,kpi_value,kpi_caption").limit(1);
        const w = ws?.[0] || null; setClientWorkspace(w);
        if (w && w.phase !== "prospect") {
          const { data: svc } = await supabase.from("client_services").select("department,service_label,service_key").eq("workspace_id", w.id);
          setClientServices(svc || []);
        }
        setLoading(false);
        return;
      }

      // agency: route to the right home
      const { data: all } = await supabase.from("workspaces").select("project_lead_id");
      const seesAll = !!p.is_super_admin || (all || []).some((w) => w.project_lead_id === uid);
      router.replace(seesAll ? "/overview" : "/my-work");
    })();
  }, [router]);

  if (loading) return <div className="center">Loading your workspace…</div>;
  if (profile?.side !== "client") return <div className="center">Taking you to your workspace…</div>;
  if (!clientWorkspace) return <div className="center">Your account is being set up. Please check back shortly.</div>;
  return <ClientView workspace={clientWorkspace} services={clientServices} profile={profile} />;
}
