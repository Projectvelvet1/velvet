"use client";
import { useRouter } from "next/navigation";

// active: 'dashboard' | 'clients' | 'prospects' | 'invite' | 'team'
export default function AgencyNav({ profile, active, depts = [] }) {
  const router = useRouter();
  const go = (path) => () => router.push(path);
  const item = (key, label, path) =>
    active === key ? <a className="on">{label}</a> : <a onClick={go(path)} style={{ cursor: "pointer" }}>{label}</a>;
  return (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        {item("dashboard", "Dashboard", "/dashboard")}
        {item("clients", "Clients", "/clients")}
        {profile?.is_super_admin && item("prospects", "Prospects", "/prospects")}
        {item("invite", "Invite teammate", "/invite")}
      </nav>
      {depts.map((d) => (
        <div key={d.key}>
          <div className="grp">{d.label}</div>
          <nav className="nav">
            {d.services.map((s) => (
              <a key={s.key} className={"svc-menu svc svc-" + s.key}><span className="svc-dot" />{s.label}</a>
            ))}
          </nav>
        </div>
      ))}
      <div className="grp">Team</div>
      <nav className="nav">
        {item("team", "Team", "/team")}
        <a>Replays</a>
        {item("feedback", "Clients feedback", "/feedback")}
        <a>Reports &amp; docs</a>
      </nav>
    </>
  );
}
