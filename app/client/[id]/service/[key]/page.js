"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import Shell from "../../../../../components/Shell";
import AgencyNav from "../../../../../components/AgencyNav";
import Modal from "../../../../../components/Modal";
import { loadAgencyDepts, DEPARTMENTS } from "../../../../../lib/agencyNav";

export const dynamic = "force-dynamic";

const DEMO_ITEMS = [
  { t: "Technical audit fixes", s: "In progress", bg: "#FFF3D6", fg: "#9A6B00" },
  { t: "Schema markup for /aviator", s: "To do", bg: "#EEF0FF", fg: "#3B49C7" },
  { t: "Meta descriptions rewrite", s: "Delivered", bg: "#E7F0FF", fg: "#2557C7" },
  { t: "Backlink cleanup", s: "Needs another look", bg: "#FDEBD3", fg: "#B4640C" },
];
const DEMO_COMPARE = { traffic: "128k", kw: "1,240", bl: "64k" };

export default function ClientServiceDashboard() {
  const router = useRouter();
  const { id, key } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [ws, setWs] = useState(null);
  const [members, setMembers] = useState([]);
  const [member, setMember] = useState(null);
  const [comps, setComps] = useState([]);
  const [newComp, setNewComp] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const svc = DEPARTMENTS.flatMap((d) => d.services).find((s) => s.key === key);
  const isSeo = key === "seo";

  async function loadComps() {
    const { data } = await supabase.from("competitors").select("id,name").eq("workspace_id", id).eq("service_key", key).order("created_at");
    setComps(data || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", uid).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(uid, !!prof?.is_super_admin));
      // read the client record directly (RLS grants super admin, project lead, or assigned member)
      const { data: w } = await supabase.from("workspaces").select("id,name,industry,website,start_date,project_lead_id").eq("id", id).single();
      if (!w) { router.replace("/dashboard"); return; }
      setWs(w);
      setCanEdit(!!prof.is_super_admin || w.project_lead_id === uid || true); // agency members on the client may edit; RLS enforces
      const { data: asg } = await supabase.from("service_assignments").select("profile_id").eq("workspace_id", id).eq("service_key", key);
      const ids = [...new Set((asg || []).map((a) => a.profile_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
      setMembers(profs || []);
      await loadComps();
      setLoading(false);
    })();
  }, [router, id, key]);

  async function addComp(e) {
    e.preventDefault();
    const name = newComp.trim(); if (!name) return;
    const { error } = await supabase.from("competitors").insert({ workspace_id: id, service_key: key, name });
    if (!error) { setNewComp(""); loadComps(); }
  }
  async function removeComp(cid) {
    await supabase.from("competitors").delete().eq("id", cid);
    loadComps();
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={<AgencyNav profile={profile} active={"svc:" + key} depts={depts} />}>
      <a style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }} onClick={() => router.push(`/client/${id}`)}>← {ws?.name || "Client"}</a>
      <div className="page-head" style={{ marginTop: 8 }}>
        <h1 style={{ fontSize: 24, display: "flex", alignItems: "center", gap: 10 }}>{ws?.name} <span className="pill" style={{ background: "#E7F0FF", color: "#2557C7" }}>{svc?.label || key}</span></h1>
        <span className="pill p-agency">Oversight</span>
      </div>
      <div className="empty" style={{ marginBottom: 14 }}>You're seeing exactly what the {svc?.label || "service"} team sees for this client. Internal, the client sees only the reports.</div>

      <div className="card">
        <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 8 }}>{svc?.label} team on this client — click to see their current work</div>
        {members.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No one assigned to this service yet.</div>
          : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map((m) => (
                <button key={m.id} className="pill" style={{ border: "0.5px solid var(--line)", cursor: "pointer" }} onClick={() => setMember(m)}>{(m.full_name || m.email)} →</button>
              ))}
            </div>}
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>{isSeo ? "Search performance" : (svc?.label + " performance")} <span className="pill p-agency" style={{ marginLeft: 4 }}>demo · GSC</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {(isSeo ? [["Clicks","4,820","↑ 12.4%","#177E4E"],["Impressions","138k","↓ 3.1%","#C0392B"],["Avg position","14.2","↑ 1.8","#177E4E"],["CTR","3.5%","↑ 0.4pt","#177E4E"]]
                : [["Metric A","—","",""],["Metric B","—","",""],["Metric C","—","",""],["Metric D","—","",""]]).map(([k, v, d, c]) => (
          <div className="card" key={k} style={{ margin: 0 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div>{d && <div style={{ fontSize: 11, fontWeight: 600, color: c }}>{d}</div>}</div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><b>LLM visibility</b><span className="pill p-agency">demo · Brand Radar</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[["Citations","312"],["Mentions","1,940"],["Sentiment","+0.42"],["Brand voice","68%"]].map(([k, v]) => (
            <div key={k} style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{v}</div></div>
          ))}
        </div>
      </div>

      {isSeo && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div className="card" style={{ margin: 0 }}><b style={{ fontSize: 13 }}>Top 5 queries</b><span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>
            <div style={{ marginTop: 8, fontSize: 12 }}>{[["betika login","1,290"],["betika app","870"],["aviator betika","540"],["betika jackpot","410"],["betika bonus","300"]].map(([q, n]) => (
              <div key={q} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "0.5px solid var(--line)" }}><span>{q}</span><span style={{ color: "var(--faint)" }}>{n}</span></div>))}</div></div>
          <div className="card" style={{ margin: 0 }}><b style={{ fontSize: 13 }}>Top 5 pages</b><span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>
            <div style={{ marginTop: 8, fontSize: 12 }}>{[["/login","1,540"],["/aviator","910"],["/promotions","620"],["/jackpot","480"],["/casino","360"]].map(([q, n]) => (
              <div key={q} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "0.5px solid var(--line)" }}><span>{q}</span><span style={{ color: "var(--faint)" }}>{n}</span></div>))}</div></div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><b>Competitors</b></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
          {comps.length === 0 && <span style={{ fontSize: 12, color: "var(--faint)" }}>No competitors added yet.</span>}
          {comps.map((c) => (
            <span key={c.id} className="pill" style={{ border: "0.5px solid var(--line)", display: "flex", alignItems: "center", gap: 6 }}>{c.name}
              <span style={{ cursor: "pointer", color: "var(--faint)" }} onClick={() => removeComp(c.id)}>✕</span></span>
          ))}
        </div>
        <form onSubmit={addComp} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input className="input" style={{ flex: 1 }} value={newComp} onChange={(e) => setNewComp(e.target.value)} placeholder="Add a competitor (e.g. Sportpesa)" />
          <button className="btn btn-ghost">Add</button>
        </form>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setShowCompare(true)} disabled={comps.length === 0}>Compare organic traffic, top-10 keywords &amp; backlinks</button>
      </div>

      <div className="empty" style={{ marginTop: 14 }}>The live {svc?.label || "service"} numbers, LLM visibility and the comparison connect to real Ahrefs / GSC data in a later step. This frame is on demo data; the competitors list above is real.</div>

      <div className="card" style={{ marginTop: 12 }}>
        <b>Tasks &amp; brand docs</b>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>The team's tasks for this client and the client's brand documents arrive with the Customer Action Plan and document library (next builds).</div>
      </div>

      {member && (
        <Modal title={`${member.full_name || member.email} — current work`} onClose={() => setMember(null)}>
          <div className="empty" style={{ marginBottom: 10 }}>Read-only view of what {(member.full_name || member.email).split(" ")[0]} sees for {ws?.name}. <span className="pill p-agency">demo</span></div>
          {DEMO_ITEMS.map((it) => (
            <div key={it.t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "0.5px solid var(--line)" }}>
              <span style={{ fontSize: 13 }}>{it.t}</span><span className="pill" style={{ background: it.bg, color: it.fg }}>{it.s}</span>
            </div>
          ))}
        </Modal>
      )}

      {showCompare && (
        <Modal title="You vs competitors" onClose={() => setShowCompare(false)}>
          <div className="empty" style={{ marginBottom: 10 }}>Organic traffic, top-10 keywords, backlinks. <span className="pill p-agency">demo — real Ahrefs data later</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, fontSize: 12, color: "var(--faint)", paddingBottom: 6, borderBottom: "0.5px solid var(--line)" }}>
            <span></span><span style={{ textAlign: "right" }}>Traffic</span><span style={{ textAlign: "right" }}>Top-10 kws</span><span style={{ textAlign: "right" }}>Backlinks</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid var(--line)", background: "#FCF7E6", borderRadius: 6 }}>
            <b style={{ paddingLeft: 6 }}>{ws?.name} (you)</b><span style={{ textAlign: "right", fontWeight: 600 }}>{DEMO_COMPARE.traffic}</span><span style={{ textAlign: "right", fontWeight: 600 }}>{DEMO_COMPARE.kw}</span><span style={{ textAlign: "right", fontWeight: 600, paddingRight: 6 }}>{DEMO_COMPARE.bl}</span>
          </div>
          {comps.map((c, i) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, alignItems: "center", padding: "9px 6px", borderBottom: "0.5px solid var(--line)", fontSize: 13 }}>
              <span>{c.name}</span><span style={{ textAlign: "right" }}>{["201k","96k","175k","150k"][i % 4]}</span><span style={{ textAlign: "right" }}>{["1,880","910","1,540","1,200"][i % 4]}</span><span style={{ textAlign: "right" }}>{["112k","41k","98k","70k"][i % 4]}</span>
            </div>
          ))}
        </Modal>
      )}
    </Shell>
  );
}
