"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// active: 'dashboard' | 'clients' | 'prospects' | 'team' | 'feedback' | 'settings' | 'svc:<serviceKey>'
export default function AgencyNav({ profile, active, depts = [] }) {
  const router = useRouter();
  const go = (path) => () => router.push(path);
  const isSuper = !!profile?.is_super_admin;
  const activeSvc = active && active.startsWith("svc:") ? active.slice(4) : null;
  const deptOfActive = depts.find((d) => d.services.some((s) => s.key === activeSvc))?.key || null;
  const [open, setOpen] = useState(deptOfActive);
  const item = (key, label, path) =>
    active === key ? <a className="on">{label}</a> : <a onClick={go(path)} style={{ cursor: "pointer" }}>{label}</a>;
  return (
    <>
      <div className="grp">Work</div>
      <nav className="nav">
        {item("overview", "Overview", "/overview")}
        {item("mywork", "My Work", "/my-work")}
        {item("clients", "Clients", "/clients")}
        {isSuper && item("prospects", "Future Clients", "/prospects")}
      </nav>

      <div className="grp">{isSuper ? "Departments" : "My department"}</div>
      <nav className="nav">
        {depts.length === 0 && <a style={{ color: "var(--faint)", fontSize: 12, cursor: "default" }}>None assigned yet</a>}
        {depts.map((d) => {
          const isOpen = open === d.key;
          return (
            <div key={d.key}>
              <a className="dept-row" onClick={() => setOpen(isOpen ? null : d.key)}>
                <span>{d.label}</span>
                <span className="dept-caret">{isOpen ? "▾" : "▸"}</span>
              </a>
              {isOpen && d.services.map((s) => (
                <a key={s.key} onClick={go("/service/" + s.key)} className={"svc-child svc svc-" + s.key + (activeSvc === s.key ? " on" : "")}>
                  <span className="svc-dot" />{s.label}
                </a>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="grp">More</div>
      <nav className="nav">
        <a>Replays</a>
        {isSuper && item("feedback", "Clients feedback", "/feedback")}
        {item("settings", "Settings", "/settings")}
      </nav>
    </>
  );
}
