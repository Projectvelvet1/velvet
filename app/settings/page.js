"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import { loadAgencyDepts } from "../../lib/agencyNav";

export default function Settings() {
  const router = useRouter();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      setDepts(await loadAgencyDepts(session.user.id, !!prof?.is_super_admin));
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof); setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="center">Loading…</div>;
  const nav = <AgencyNav profile={profile} active="settings" depts={depts} />;
  const roleLabel = profile?.is_super_admin ? "Super admin" : "Team member";

  const tile = (title, desc, path, ready = true) => (
    <div className="card" style={{ margin: 0, cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.6 }} onClick={ready ? () => router.push(path) : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b>{title}</b>{ready ? <span style={{ color: "var(--faint)" }}>→</span> : <span className="pill p-agency">coming soon</span>}
      </div>
      <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 4 }}>{desc}</div>
    </div>
  );

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Settings</h1><span className="pill p-agency">{roleLabel}</span></div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", margin: "4px 0 8px" }}>Team &amp; access</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {tile("Invite teammate", "Add someone from your agency and set what they can access.", "/invite")}
        {tile("Team", "See everyone in the agency, edit details, change access, or remove people.", "/team")}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", margin: "4px 0 8px" }}>Configuration</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {tile("Ask Velvet training", "Teach Ask Velvet how each department wants its answers, and which data sources to use.", "/settings/velvet")}
        {tile("Onboarding questions", "Manage the questions clients answer during onboarding and discovery.", "/questions")}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", margin: "4px 0 8px" }}>Coming soon</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tile("Appearance", "Light mode and other display preferences.", "#", false)}
        {tile("Data connections", "Connect and manage Ahrefs, Google Search Console, analytics and ad sources.", "#", false)}
      </div>
    </Shell>
  );
}
