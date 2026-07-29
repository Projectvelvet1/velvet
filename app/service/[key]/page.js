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

  const svc = DEPARTMENTS.flatMap((d) => d.services).find((s) => s.key === key);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, !!prof?.is_super_admin));
      setLoading(false);
    })();
  }, [router, key]);

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={<AgencyNav profile={profile} active={"svc:" + key} depts={depts} />}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>{svc ? svc.label : "Service"}</h1></div>
      <div className="empty">The clients list and live dashboard for {svc ? svc.label : "this service"} land in the next stage of this build.</div>
    </Shell>
  );
}
