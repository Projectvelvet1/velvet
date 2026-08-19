"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import ClientView from "../../../components/ClientView";

export default function ClientMirror() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [services, setServices] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin,home_service").eq("id", session.user.id).single();
      setProfile(prof || null);
      // read the client record directly in the browser (RLS lets a super admin,
      // the project lead, or an assigned member see it). No API route in the path.
      const { data: w, error: wErr } = await supabase.from("workspaces")
        .select("id,name,phase,onboarding_complete,discovery_complete,project_lead_id,website,industry,start_date,lead_name,health,upsell,notes,kpi_label,kpi_value,kpi_caption")
        .eq("id", id).single();
      if (wErr || !w) { setError("This client couldn't be loaded, or you don't have access."); setLoading(false); return; }
      setWs(w);
      const { data: svc } = await supabase.from("client_services").select("department,service_label,service_key").eq("workspace_id", id);
      setServices(svc || []);
      setLoading(false);
    })();
  }, [id, router]);

  if (loading) return <div className="center">Loading…</div>;
  if (error) return (
    <div className="center" style={{ flexDirection: "column", gap: 12 }}>
      <div>{error}</div>
      <button className="btn btn-ghost" onClick={() => router.push("/clients")}>← Back to clients</button>
    </div>
  );

  return <ClientView workspace={ws} services={services} profile={profile} viewingAs onBack={() => router.push(ws.phase === "prospect" ? "/prospects" : "/clients")} />;
}
