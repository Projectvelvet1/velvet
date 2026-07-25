"use client";
import { useRouter } from "next/navigation";
import Shell from "./Shell";

const DEPT_LABEL = { performance: "Performance", content: "Content", analytics: "Analytics" };
const ALL_SERVICES = [
  { key: "paid_media", label: "Paid Media", dep: "performance" }, { key: "seo", label: "SEO", dep: "performance" }, { key: "aso", label: "ASO", dep: "performance" },
  { key: "creative_strategy", label: "Creative Strategy", dep: "content" }, { key: "asset_production", label: "Asset Production", dep: "content" }, { key: "ugc", label: "UGC", dep: "content" },
  { key: "tracking", label: "Tracking", dep: "analytics" }, { key: "dashboarding", label: "Dashboarding", dep: "analytics" },
];

// The client experience, shared by the client's own dashboard and the agency
// "view as" page. When viewingAs is true, it shows a banner and a "Back" footer,
// and onboarding actions target this specific client.
export default function ClientView({ workspace, services = [], profile, viewingAs = false, onBack }) {
  const router = useRouter();
  const isProspect = workspace?.phase === "prospect";
  const onboarded = !!workspace?.onboarding_complete;
  const firstName = (profile?.full_name || profile?.email || workspace?.name || "there").split(" ")[0].split("@")[0];
  const onbHref = viewingAs ? `/onboarding?ws=${workspace.id}` : "/onboarding";
  const grouped = {}; services.forEach((s) => { (grouped[s.department] ||= []).push(s); });

  let nav;
  if (isProspect) {
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

  const banner = viewingAs ? (
    <div className="viewbar">
      <div><b>Viewing as {workspace.name}</b> · you can act on this client's behalf</div>
      <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={onBack}>← Back</button>
    </div>
  ) : null;

  const footer = viewingAs ? <button className="signout" onClick={onBack}>← Back to agency</button> : null;
  const roleLabel = viewingAs ? "Client view" : "Client";
  const shellProfile = viewingAs ? { full_name: workspace.name, email: "" } : profile;

  return (
    <Shell profile={shellProfile} roleLabel={roleLabel} nav={nav} banner={banner} footer={footer}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>{viewingAs ? workspace.name : `Welcome, ${firstName}`}</h1>
        <span className="pill p-client">{isProspect ? "Discovery" : "Client"}</span>
      </div>

      {isProspect ? (
        <>
          {!workspace.discovery_complete ? (
            <div className="card" style={{ borderColor: "var(--border-accent)" }}>
              <b>Welcome 👋 Let's understand your business</b>
              <p style={{ color: "var(--muted)", margin: "6px 0 14px", fontSize: 14 }}>
                {viewingAs ? "Fill in the discovery questions on this client's behalf." : "A few quick questions about your goals and challenges, so Welcome Tomorrow can help you best."}
              </p>
              <button className="btn btn-primary" onClick={() => router.push(onbHref)}>{viewingAs ? "Open discovery onboarding →" : "Start →"}</button>
            </div>
          ) : (
            <div className="card"><b>{viewingAs ? "Discovery completed" : "Thanks, we've got your answers 🙌"}</b>
              <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>
                {viewingAs ? "You can review the answers." : "Your Welcome Tomorrow team will be in touch shortly."}
              </p>
              {viewingAs && <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => router.push(onbHref)}>Review answers</button>}
            </div>
          )}
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>What Welcome Tomorrow offers</h3>
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 0 }}>A taste of what we can do.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {ALL_SERVICES.map((s) => (
              <div key={s.key} className={"card svc-card svc svc-" + s.key} style={{ opacity: .5, filter: "blur(0.5px)", margin: 0 }}>
                <b>{s.label}</b><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{DEPT_LABEL[s.dep]}</div>
              </div>
            ))}
          </div>
        </>
      ) : !onboarded ? (
        <>
          <div className="card" style={{ borderColor: "var(--border-accent)" }}>
            <b>{viewingAs ? "Client onboarding" : "Welcome to Welcome Tomorrow 👋"}</b>
            <p style={{ color: "var(--muted)", margin: "6px 0 14px", fontSize: 14 }}>
              {viewingAs ? "Fill in onboarding on this client's behalf." : `Let's get ${workspace.name} set up. Completing onboarding unlocks your dashboards.`}
            </p>
            <button className="btn btn-primary" onClick={() => router.push(onbHref)}>{viewingAs ? "Open onboarding →" : "Start onboarding →"}</button>
          </div>
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>{viewingAs ? "Services" : "Your services"}</h3>
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 0 }}>These unlock once onboarding is complete.</p>
          {services.length === 0 ? <div className="empty">No services recorded.</div>
            : services.map((s) => (
              <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key} style={{ opacity: .55 }}>
                <b>{s.service_label}</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Locked until onboarding is complete</div>
              </div>
            ))}
        </>
      ) : (
        <>
          <div className="card"><b>{workspace.name}</b>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>Dashboards are ready.</p>
          </div>
          <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>{viewingAs ? "Services" : "Your services"}</h3>
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
