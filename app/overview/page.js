"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import AskVelvet from "../../components/AskVelvet";
import ClientDrawer from "../../components/ClientDrawer";
import ServiceDrawer from "../../components/ServiceDrawer";
import { departmentsForRole, DEPARTMENTS } from "../../lib/agencyNav";

const HEALTH = { healthy: { l: "Healthy", bg: "#E4F6EC", fg: "#177E4E" }, watch: { l: "To watch", bg: "#FDEBD3", fg: "#B4640C" }, risk: { l: "At risk", bg: "#FBEAE6", fg: "#C0392B" }, held: { l: "Held", bg: "#EEF1F4", fg: "#5B6472" } };
const DEPT_COLOR = { performance: "#C0392B", content: "#7C3AED", analytics: "#1E7F5C" };
const DEPT_LABEL = { performance: "Performance", content: "Content", analytics: "Analytics" };
const SVC_DEPT = { paid_media: "Performance", seo: "Performance", aso: "Performance", creative_strategy: "Content", asset_production: "Content", ugc: "Content", tracking: "Analytics", dashboarding: "Analytics" };
const SVC_COLOR = { seo: "#2557C7", paid_media: "#C0392B", aso: "#0E8C7A", creative_strategy: "#B4640C", asset_production: "#7C3AED", ugc: "#D6336C", tracking: "#1E7F5C", dashboarding: "#3D4EE8" };
const DEPT_ORDER = ["Performance", "Content", "Analytics"];
const initials = (n) => (n || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

// demo work-queue signals (tagged) until a signals table exists
const SIGNALS = [
  { id: 1, icon: "📉", title: "Organic clicks down 18%", urgency: "Overdue", cat: "SEO", desc: "Top landing page lost 3 positions this week." },
  { id: 2, icon: "💸", title: "Wasted spend rising", urgency: "Due now", cat: "Paid Media", desc: "Non-brand search CPA up 22% over 7 days." },
  { id: 3, icon: "⭐", title: "Feedback dipped to 6/10", urgency: "Soon", cat: "Account", desc: "Latest client score fell 2 points." },
];
const URG = { Overdue: { bg: "#FBEAE6", fg: "#C0392B" }, "Due now": { bg: "#FDEBD3", fg: "#B4640C" }, Soon: { bg: "#EEF0FF", fg: "#3B49C7" } };

export default function Overview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);        // [{id,name,role,dept,services:[],clients:[]}]
  const [deptCards, setDeptCards] = useState([]); // [{key,label,color,services:[{key,label,clientCount}]}]
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState(null); // null=active(all)
  const [openClient, setOpenClient] = useState(null);
  const [openService, setOpenService] = useState(null);
  const [signals, setSignals] = useState(SIGNALS.map((s) => ({ ...s, owner: null })));
  const [assignOpen, setAssignOpen] = useState(null);
  const [usageMode, setUsageMode] = useState("individual");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", uid).single();
      const p = prof || { id: uid, email: session.user.email, side: "agency" };
      setProfile(p);
      if (p.side === "client") { router.replace("/dashboard"); return; }

      const { data: ws } = await supabase.from("workspaces")
        .select("id,name,is_demo,phase,onboarding_complete,project_lead_id,industry,website,start_date,lead_name,health,upsell,notes,kpi_label,kpi_value,kpi_caption")
        .order("created_at", { ascending: true });
      const all = ws || [];
      const isProjectLead = all.some((w) => w.project_lead_id === uid);
      const seesAll = !!p.is_super_admin || isProjectLead;
      if (!seesAll) { router.replace("/my-work"); return; }

      const { data: assignsMine } = await supabase.from("service_assignments").select("service_key").eq("profile_id", uid);
      setDepts(departmentsForRole({ seesAll, assignedServiceKeys: new Set((assignsMine || []).map((a) => a.service_key)) }));

      let active = all.filter((w) => w.phase === "signed" && w.onboarding_complete);
      if (!p.is_super_admin) active = active.filter((w) => w.project_lead_id === uid);
      const ids = active.map((w) => w.id);

      let svcs = [], asg = [], subs = [], profs = [];
      if (ids.length) {
        const r = await Promise.all([
          supabase.from("client_services").select("workspace_id,service_key,service_label").in("workspace_id", ids),
          supabase.from("service_assignments").select("workspace_id,service_key,profile_id").in("workspace_id", ids),
          supabase.from("feedback_submissions").select("workspace_id,overall_score,created_at").in("workspace_id", ids).order("created_at", { ascending: false }),
        ]);
        svcs = r[0].data || []; asg = r[1].data || []; subs = r[2].data || [];
        const leadIds = active.map((w) => w.project_lead_id).filter(Boolean);
        const profIds = [...new Set([...asg.map((a) => a.profile_id), ...leadIds])];
        profs = profIds.length ? (await supabase.from("profiles").select("id,full_name,email,job_title,home_department").in("id", profIds)).data || [] : [];
      }
      const nameOf = (id) => { const pr = profs.find((x) => x.id === id); return pr ? (pr.full_name || pr.email) : "Unknown"; };

      const built = active.map((w) => {
        const services = svcs.filter((s) => s.workspace_id === w.id);
        const byDept = {};
        asg.filter((a) => a.workspace_id === w.id).forEach((a) => {
          const dept = SVC_DEPT[a.service_key] || "Other";
          (byDept[dept] = byDept[dept] || []).push(nameOf(a.profile_id));
        });
        const teamGrouped = DEPT_ORDER.filter((d) => byDept[d]).map((d) => ({ dept: d, members: [...new Set(byDept[d])] }));
        const fb = subs.find((s) => s.workspace_id === w.id) || null;
        return {
          id: w.id, name: w.name, is_demo: w.is_demo, industry: w.industry, phase: w.phase, onboarding_complete: w.onboarding_complete,
          lead_name: w.lead_name || (w.project_lead_id ? nameOf(w.project_lead_id) : null),
          health: w.health || "healthy", services: services.map((s) => s.service_label), serviceKeys: services.map((s) => s.service_key),
          team: teamGrouped, feedback: fb ? { overall: fb.overall_score, date: fb.created_at } : null,
          kpi_label: w.kpi_label, kpi_value: w.kpi_value, kpi_caption: w.kpi_caption,
        };
      });
      setClients(built);

      // department cards with client counts per service
      const cards = DEPARTMENTS.map((d) => ({
        key: d.key, label: d.label, color: DEPT_COLOR[d.key],
        services: d.services.map((s) => ({ key: s.key, label: s.label, clientCount: new Set(svcs.filter((x) => x.service_key === s.key).map((x) => x.workspace_id)).size })),
      }));
      setDeptCards(cards);

      // team roster
      const roster = {};
      asg.forEach((a) => {
        const pr = profs.find((x) => x.id === a.profile_id); if (!pr) return;
        const key = a.profile_id;
        roster[key] = roster[key] || { id: key, name: pr.full_name || pr.email, role: pr.job_title || DEPT_LABEL[pr.home_department] || "Team", services: new Set(), clients: new Set() };
        roster[key].services.add(a.service_key);
        const cn = built.find((c) => c.id === a.workspace_id)?.name; if (cn) roster[key].clients.add(cn);
      });
      setTeam(Object.values(roster).map((r) => ({ ...r, services: [...r.services], clients: [...r.clients] })));
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="center">Loading overview…</div>;

  const roleLabel = profile?.is_super_admin ? "Super admin" : "Team member";
  const nav = <AgencyNav profile={profile} active="overview" depts={depts} />;

  const counts = {
    active: clients.length,
    healthy: clients.filter((c) => c.health === "healthy").length,
    watch: clients.filter((c) => c.health === "watch").length,
    risk: clients.filter((c) => c.health === "risk").length,
    held: clients.filter((c) => c.health === "held").length,
  };
  const STAT = [
    { key: null, label: "Active clients", n: counts.active },
    { key: "healthy", label: "Healthy", n: counts.healthy },
    { key: "watch", label: "To watch", n: counts.watch },
    { key: "risk", label: "At risk", n: counts.risk },
    { key: "held", label: "Held", n: counts.held },
  ];
  const CHIPS = [{ key: null, label: "All", n: counts.active }, { key: "healthy", label: "Healthy", n: counts.healthy }, { key: "watch", label: "To watch", n: counts.watch }, { key: "risk", label: "At risk", n: counts.risk }, { key: "held", label: "Held", n: counts.held }];

  const filtered = clients.filter((c) => (!healthFilter || c.health === healthFilter) && (!search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || (c.industry || "").toLowerCase().includes(search.toLowerCase())));

  // demo platform usage (tagged)
  const usageRows = {
    individual: team.length ? team.map((m, i) => ({ name: m.name, actions: 40 - i * 5 + 12, adoption: Math.max(20, 92 - i * 11), days: Math.max(1, 5 - i), last: i === 0 ? "today" : i + "d ago" }))
      : [{ name: "No team yet", actions: 0, adoption: 0, days: 0, last: "—" }],
    department: DEPT_ORDER.map((d, i) => ({ name: d, actions: 120 - i * 30, adoption: 80 - i * 12 })),
    service: Object.keys(SVC_COLOR).map((k, i) => ({ name: (DEPARTMENTS.flatMap((d) => d.services).find((s) => s.key === k) || {}).label || k, actions: 60 - i * 6, adoption: 75 - i * 7 })),
  };

  const openClientById = (id) => { const c = clients.find((x) => x.id === id); if (c) { setOpenService(null); setOpenClient(c); } };

  return (
    <Shell profile={profile} roleLabel={roleLabel} nav={nav}>
      <div className="page-head">
        <h1 style={{ fontSize: 24 }}>Overview</h1>
        <span className="pill p-agency">{roleLabel}</span>
      </div>

      {/* Health stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
        {STAT.map((s) => {
          const on = (s.key === null && !healthFilter) || s.key === healthFilter;
          return (
            <div key={s.label} className="card" style={{ margin: 0, cursor: "pointer", outline: on ? "2px solid var(--gold,#F7C948)" : "none" }} onClick={() => setHealthFilter(s.key)}>
              <div style={{ fontSize: 12, color: "var(--faint)" }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{s.n}</div>
            </div>
          );
        })}
      </div>

      {/* Ask Velvet */}
      <AskVelvet suggestions={["Which clients need attention this week?", "Summarise performance across all clients"]} />

      {/* What needs attention */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <b>What needs attention</b><span className="pill p-agency">demo signals</span>
        </div>
        {signals.map((s) => {
          const u = URG[s.urgency] || URG.Soon;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "0.5px solid var(--line)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--cloud,#F5F6F8)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b style={{ fontSize: 13 }}>{s.title}</b>
                  <span className="pill" style={{ background: u.bg, color: u.fg }}>{s.urgency}</span>
                  <span className="pill" style={{ background: "#EEF1F4", color: "#5B6472" }}>{s.cat}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{s.desc}</div>
              </div>
              <div style={{ position: "relative", flex: "none" }}>
                <button className="btn btn-ghost" onClick={() => setAssignOpen(assignOpen === s.id ? null : s.id)}>{s.owner || "Assign"} ▾</button>
                {assignOpen === s.id && (
                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.12)", zIndex: 5, minWidth: 180, maxHeight: 220, overflowY: "auto" }}>
                    {team.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: "var(--faint)" }}>No team members</div>
                      : team.map((m) => (
                        <div key={m.id} style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer" }} onClick={() => { setSignals(signals.map((x) => x.id === s.id ? { ...x, owner: m.name } : x)); setAssignOpen(null); }}>{m.name}</div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Clients */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b>Clients</b>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
          {CHIPS.map((c) => {
            const on = (c.key === null && !healthFilter) || c.key === healthFilter;
            return <button key={c.label} className="pill" style={{ cursor: "pointer", border: "0.5px solid var(--line)", background: on ? "var(--ink,#0B0D12)" : "transparent", color: on ? "#fff" : "var(--muted)" }} onClick={() => setHealthFilter(c.key)}>{c.label} · {c.n}</button>;
          })}
        </div>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)", padding: "10px 0" }}>No clients match.</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: "var(--faint)", fontSize: 11, textAlign: "left" }}>
                  <th style={{ padding: "6px 6px", fontWeight: 400 }}>Client</th><th style={{ fontWeight: 400 }}>Phase</th><th style={{ fontWeight: 400 }}>Services</th><th style={{ fontWeight: 400 }}>Lead</th><th style={{ fontWeight: 400 }}>Onboarding</th><th style={{ fontWeight: 400 }}>Health</th>
                </tr></thead>
                <tbody>
                  {filtered.map((c) => {
                    const h = HEALTH[c.health] || HEALTH.healthy;
                    return (
                      <tr key={c.id} onClick={() => openClientById(c.id)} style={{ cursor: "pointer", borderTop: "0.5px solid var(--line)" }}>
                        <td style={{ padding: "10px 6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(c.name)}</span>
                            <div><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{c.industry || "—"}</div></div>
                          </div>
                        </td>
                        <td><span className="pill" style={{ background: "#EEF1F4", color: "#5B6472" }}>{c.phase === "prospect" ? "Discovery" : "Signed"}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {c.services.slice(0, 3).map((s) => <span key={s} className="pill p-agency">{s}</span>)}
                            {c.services.length > 3 && <span className="pill" style={{ background: "#EEF1F4", color: "#5B6472" }}>+{c.services.length - 3}</span>}
                          </div>
                        </td>
                        <td>{c.lead_name ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{initials(c.lead_name)}</span>{c.lead_name}</span> : <span style={{ color: "#B4640C" }}>Unassigned</span>}</td>
                        <td><span className="pill" style={{ background: c.onboarding_complete ? "#E4F6EC" : "#FDEBD3", color: c.onboarding_complete ? "#177E4E" : "#B4640C" }}>{c.onboarding_complete ? "Complete" : "In progress"}</span></td>
                        <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="pill" style={{ background: h.bg, color: h.fg }}>{h.l}</span><span style={{ color: "var(--faint)" }}>›</span></span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Departments */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 }}>
        {deptCards.map((d) => (
          <div key={d.key} className="card" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
            <div style={{ height: 5, background: d.color }} />
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <b>{d.label}</b><span style={{ fontSize: 12, color: "var(--faint)" }}>{d.services.length} services</span>
              </div>
              <div style={{ marginTop: 10 }}>
                {d.services.map((s) => (
                  <div key={s.key} onClick={() => { setOpenClient(null); setOpenService({ key: s.key, label: s.label, color: SVC_COLOR[s.key], dept: d.label, clients: clients.filter((c) => c.serviceKeys.includes(s.key)).map((c) => ({ id: c.id, name: c.name, industry: c.industry, health: c.health })), team: team.filter((m) => m.services.includes(s.key)) }); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "0.5px solid var(--line)", cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: SVC_COLOR[s.key], display: "inline-block" }} />{s.label}</span>
                    <span style={{ fontSize: 12, color: "var(--faint)" }}>{s.clientCount} client{s.clientCount === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform usage */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <b>Platform usage <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 400 }}>· Last 7 days</span></b>
          <div style={{ display: "flex", gap: 4, background: "var(--cloud,#F5F6F8)", padding: 4, borderRadius: 10 }}>
            {[["individual", "Individual"], ["department", "Department"], ["service", "Service"]].map(([v, l]) => (
              <button key={v} className="btn" style={{ padding: "6px 12px", fontSize: 13, background: usageMode === v ? "#fff" : "transparent", boxShadow: usageMode === v ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: usageMode === v ? "var(--text)" : "var(--muted)" }} onClick={() => setUsageMode(v)}>{l}</button>
            ))}
          </div>
        </div>
        <span className="pill p-agency" style={{ marginTop: 8, display: "inline-block" }}>demo usage</span>
        <div style={{ marginTop: 10 }}>
          {usageRows[usageMode].map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: usageMode === "individual" ? "1.4fr 2fr auto auto auto auto" : "1.4fr 2fr auto auto", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "0.5px solid var(--line)", fontSize: 13 }}>
              <div style={{ fontWeight: 500 }}>{r.name}</div>
              <div className="ubar"><span style={{ width: `${Math.min(100, r.adoption)}%` }} /></div>
              <div style={{ color: "var(--faint)" }}>{r.actions} actions</div>
              <div style={{ color: "var(--faint)" }}>{r.adoption}%</div>
              {usageMode === "individual" && <div style={{ color: "var(--faint)" }}>{r.days}d active</div>}
              {usageMode === "individual" && <div style={{ color: "var(--faint)" }}>{r.last}</div>}
            </div>
          ))}
        </div>
      </div>

      {openClient && <ClientDrawer key={openClient.id} client={openClient} onClose={() => setOpenClient(null)} />}
      {openService && <ServiceDrawer service={openService} onClose={() => setOpenService(null)} onOpenClient={openClientById} />}
    </Shell>
  );
}
