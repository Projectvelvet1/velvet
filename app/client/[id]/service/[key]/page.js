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

export default function ClientServiceDashboard() {
  const router = useRouter();
  const { id, key } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [ws, setWs] = useState(null);
  const [members, setMembers] = useState([]);
  const [member, setMember] = useState(null);
  const svc = DEPARTMENTS.flatMap((d) => d.services).find((s) => s.key === key);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, !!prof?.is_super_admin));
      // authorize + get client via client-context (super admin any, project lead own)
      const res = await fetch(`/api/client-context?id=${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { router.replace("/dashboard"); return; }
      const j = await res.json(); setWs(j.workspace);
      // members assigned to this service on this client
      const { data: asg } = await supabase.from("service_assignments").select("profile_id").eq("workspace_id", id).eq("service_key", key);
      const ids = [...new Set((asg || []).map((a) => a.profile_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
      setMembers(profs || []);
      setLoading(false);
    })();
  }, [router, id, key]);

  if (loading) return <div className="center">Loading…</div>;

  const isSeo = key === "seo";

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={<AgencyNav profile={profile} active={"svc:" + key} depts={depts} />}>
      <a style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }} onClick={() => router.push(`/client/${id}`)}>← {ws?.name || "Client"}</a>
      <div className="page-head" style={{ marginTop: 8 }}>
        <h1 style={{ fontSize: 24 }}>{ws?.name} · {svc?.label || key}</h1>
        <span className="pill p-agency">Oversight</span>
      </div>
      <div className="empty" style={{ marginBottom: 14 }}>You're seeing exactly what the {svc?.label || "service"} team sees for this client.</div>

      <div className="card">
        <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 8 }}>{svc?.label} team on this client — click to see their current work</div>
        {members.length === 0 ? <div style={{ fontSize: 13, color: "var(--faint)" }}>No one assigned to this service yet.</div>
          : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map((m) => (
                <button key={m.id} className="pill" style={{ border: "0.5px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setMember(m)}>
                  {(m.full_name || m.email)} →
                </button>
              ))}
            </div>}
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, margin: "16px 0 8px" }}>{isSeo ? "Search performance" : svc?.label + " performance"} <span className="pill p-agency" style={{ marginLeft: 4 }}>demo</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {(isSeo ? [["Clicks","4,820"],["Impressions","138k"],["Avg position","14.2"],["CTR","3.5%"]] : [["Metric A","—"],["Metric B","—"],["Metric C","—"],["Metric D","—"]]).map(([k, v]) => (
          <div className="card" key={k} style={{ margin: 0 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div></div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><b>LLM visibility</b><span className="pill p-agency">demo</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[["Citations","312"],["Mentions","1,940"],["Sentiment","+0.42"],["Brand voice","68%"]].map(([k, v]) => (
            <div key={k} style={{ background: "var(--cloud,#F5F6F8)", borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{v}</div></div>
          ))}
        </div>
      </div>

      <div className="empty" style={{ marginTop: 14 }}>The live {svc?.label || "service"} dashboard, competitors and comparison connect to real data (Ahrefs / GSC) in a later build. This frame is on demo data.</div>

      {member && (
        <Modal title={`${member.full_name || member.email} — current work`} onClose={() => setMember(null)}>
          <div className="empty" style={{ marginBottom: 10 }}>Read-only view of what {(member.full_name || member.email).split(" ")[0]} sees for {ws?.name}. <span className="pill p-agency">demo</span></div>
          {DEMO_ITEMS.map((it) => (
            <div key={it.t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "0.5px solid var(--line)" }}>
              <span style={{ fontSize: 13 }}>{it.t}</span>
              <span className="pill" style={{ background: it.bg, color: it.fg }}>{it.s}</span>
            </div>
          ))}
        </Modal>
      )}
    </Shell>
  );
}
