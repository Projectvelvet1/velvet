"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import ClientView from "../../components/ClientView";

const DEPT_LABEL = { performance: "Performance", content: "Content", analytics: "Analytics" };
const ALL_SERVICES = [
  { key: "paid_media", label: "Paid Media", dep: "performance" }, { key: "seo", label: "SEO", dep: "performance" }, { key: "aso", label: "ASO", dep: "performance" },
  { key: "creative_strategy", label: "Creative Strategy", dep: "content" }, { key: "asset_production", label: "Asset Production", dep: "content" }, { key: "ugc", label: "UGC", dep: "content" },
  { key: "tracking", label: "Tracking", dep: "analytics" }, { key: "dashboarding", label: "Dashboarding", dep: "analytics" },
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      const p = prof || { email: session.user.email, side: "agency" };
      setProfile(p);
      if (p.side === "client") {
        const { data: ws } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,discovery_complete").limit(1);
        const w = ws?.[0] || null; setWorkspace(w);
        if (w && w.phase !== "prospect") {
          const { data: svc } = await supabase.from("client_services").select("department,service_label,service_key").eq("workspace_id", w.id);
          setServices(svc || []);
        }
      } else {
        const { data: ws } = await supabase.from("workspaces").select("id,name,is_demo,phase,onboarding_complete").order("created_at", { ascending: true });
        setClients(ws || []);
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="center">Loading your workspace…</div>;

  const isAgency = profile?.side === "agency";
  if (!isAgency) {
    if (!workspace) return <div className="center">Your account is being set up. Please check back shortly.</div>;
    return <ClientView workspace={workspace} services={services} profile={profile} />;
  }
  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0].split("@")[0];
  const roleLabel = profile?.is_super_admin ? "Super admin" : isAgency ? "Team member" : "Client";
  const isProspect = !isAgency && workspace?.phase === "prospect";
  const grouped = {}; services.forEach((s) => { (grouped[s.department] ||= []).push(s); });
  const onboarded = !!workspace?.onboarding_complete;

  // ---- sidebar ----
  let nav;
  if (isAgency) {
    nav = (<>
      <div className="grp">Work</div>
      <nav className="nav">
        <a className="on">Dashboard</a>
        <a onClick={() => router.push("/clients")} style={{cursor:"pointer"}}>Clients</a>
        {profile?.is_super_admin && <a onClick={() => router.push("/prospects")} style={{cursor:"pointer"}}>Prospects</a>}
        <a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite teammate</a>
      </nav>
      <div className="grp">Performance</div>
      <nav className="nav">
        <a className="svc-menu svc svc-paid_media"><span className="svc-dot" />Paid Media</a>
        <a className="svc-menu svc svc-seo"><span className="svc-dot" />SEO</a>
        <a className="svc-menu svc svc-aso"><span className="svc-dot" />ASO</a>
      </nav>
      <div className="grp">Team</div>
      <nav className="nav"><a onClick={() => router.push("/team")} style={{cursor:"pointer"}}>Team</a><a>Replays</a><a>Reports &amp; docs</a></nav>
    </>);
  } else if (isProspect) {
    // prospect: only onboarding is real; all services shown blurred as a teaser
    nav = (<>
      <div className="grp">Account</div>
      <nav className="nav"><a className="on">Onboarding</a></nav>
      <div className="grp">What we offer</div>
      <nav className="nav">
        {ALL_SERVICES.map((s) => (
          <a key={s.key} className={"svc-menu svc svc-" + s.key} style={{ opacity: .35, cursor: "default", filter: "blur(0.4px)" }}>
            <span className="svc-dot" />{s.label}
          </a>
        ))}
      </nav>
    </>);
  } else {
    nav = (<>
      <div className="grp">Account</div>
      <nav className="nav">
        <a className="on">Onboarding</a>
        <a style={{ opacity: onboarded ? 1 : .4, cursor: onboarded ? "pointer" : "default" }}>Team</a>
      </nav>
      {Object.keys(grouped).map((dep) => (
        <div key={dep}>
          <div className="grp">{DEPT_LABEL[dep] || dep}</div>
          <nav className="nav">
            {grouped[dep].map((s) => (
              <a key={s.service_key} className={"svc-menu svc svc-" + s.service_key} style={{ opacity: onboarded ? 1 : .4, cursor: onboarded ? "pointer" : "default" }}>
                <span className="svc-dot" />{s.service_label}
              </a>
            ))}
          </nav>
        </div>
      ))}
    </>);
  }

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Welcome{isAgency ? " back" : ""}, {firstName}</h1>
        <span className={"pill " + (isAgency ? "p-agency" : "p-client")}>{isAgency ? "Agency side" : "Client side"}</span>
      </div>

      {isAgency ? (
        <>
          <div className="card"><b>You're signed in.</b>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Create clients from the Clients screen and invite teammates from Invite.</p>
          </div>
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Clients you can see</h3>
          {clients.length === 0 ? <div className="empty">No clients yet. Create one from the Clients screen.</div>
            : clients.map((w) => (
              <div className="card" key={w.id}>
                <b>{w.name}</b>
                <span className="pill p-agency" style={{ marginLeft: 6 }}>{w.phase === "prospect" ? "prospect" : w.phase}</span>
                {w.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{w.onboarding_complete ? "Onboarding complete" : "Waiting onboarding"}</div>
              </div>
            ))}
        </>
      ) : !workspace ? (
        <div className="empty">Your account is being set up. Please check back shortly.</div>
      ) : isProspect ? (
        <>
          {!workspace.discovery_complete ? (
            <div className="card" style={{ borderColor: "var(--border-accent)" }}>
              <b>Welcome 👋 Let's understand your business</b>
              <p style={{ color: "var(--muted)", margin: "6px 0 14px", fontSize: 14 }}>
                A few quick questions about your goals and challenges, so Welcome Tomorrow can help you best.
              </p>
              <button className="btn btn-primary" onClick={() => router.push("/onboarding")}>Start →</button>
            </div>
          ) : (
            <div className="card"><b>Thanks, we've got your answers 🙌</b>
              <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Your Welcome Tomorrow team will be in touch shortly.</p>
            </div>
          )}
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>What Welcome Tomorrow offers</h3>
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 0 }}>A taste of what we can do for you.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {ALL_SERVICES.map((s) => (
              <div key={s.key} className={"card svc-card svc svc-" + s.key} style={{ opacity: .5, filter: "blur(0.5px)", margin: 0 }}>
                <b>{s.label}</b>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{DEPT_LABEL[s.dep]}</div>
              </div>
            ))}
          </div>
        </>
      ) : !onboarded ? (
        <>
          <div className="card" style={{ borderColor: "var(--border-accent)" }}>
            <b>Welcome to Welcome Tomorrow 👋</b>
            <p style={{ color: "var(--muted)", margin: "6px 0 14px", fontSize: 14 }}>Let's get {workspace.name} set up. Completing onboarding unlocks your dashboards.</p>
            <button className="btn btn-primary" onClick={() => router.push("/onboarding")}>Start onboarding →</button>
          </div>
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Your services</h3>
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 0 }}>These unlock once onboarding is complete.</p>
          {services.map((s) => (
            <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key} style={{ opacity: .55 }}>
              <b>{s.service_label}</b>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Locked until onboarding is complete</div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="card"><b>{workspace.name}</b>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Your dashboards are ready.</p>
          </div>
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Your services</h3>
          {services.map((s) => (
            <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key} style={{ cursor: "pointer" }}>
              <b>{s.service_label}</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{DEPT_LABEL[s.department]}</div>
            </div>
          ))}
        </>
      )}
    </Shell>
  );
}
