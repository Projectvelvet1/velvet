"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Shell from "../../../components/Shell";
import AgencyNav from "../../../components/AgencyNav";
import { loadAgencyDepts, DEPARTMENTS } from "../../../lib/agencyNav";

export const dynamic = "force-dynamic";

export default function ServicePage() {
  const router = useRouter();
  const { key } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [clients, setClients] = useState([]);
  const svc = DEPARTMENTS.flatMap((d) => d.services).find((s) => s.key === key);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", uid).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(uid, !!prof?.is_super_admin));

      // which clients bought this service
      const { data: cs } = await supabase.from("client_services").select("workspace_id").eq("service_key", key);
      const bought = new Set((cs || []).map((r) => r.workspace_id));
      // which of those this person is assigned to (for team-member scoping)
      const { data: asg } = await supabase.from("service_assignments").select("workspace_id").eq("service_key", key).eq("profile_id", uid);
      const assigned = new Set((asg || []).map((r) => r.workspace_id));
      // accessible + active clients (RLS already limits what non-super can read)
      const { data: ws } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,project_lead_id").eq("phase", "signed").eq("onboarding_complete", true);
      let list = (ws || []).filter((w) => bought.has(w.id));
      if (!prof.is_super_admin) list = list.filter((w) => assigned.has(w.id) || w.project_lead_id === uid);
      setClients(list);
      setLoading(false);
    })();
  }, [router, key]);

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={<AgencyNav profile={profile} active={"svc:" + key} depts={depts} />}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>{svc?.label || "Service"}</h1><span className="pill p-agency">{svc?.label}</span></div>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>Clients you work with on {svc?.label}. Open one to see its dashboard.</p>
      {clients.length === 0 ? <div className="empty">No active {svc?.label} clients assigned to you yet.</div>
        : clients.map((c) => (
          <div className="card" key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => router.push(`/client/${c.id}/service/${key}`)}>
            <b>{c.name}</b><span className="btn btn-ghost">Open dashboard →</span>
          </div>
        ))}
    </Shell>
  );
}
