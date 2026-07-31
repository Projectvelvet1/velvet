"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "../../components/Shell";
import AgencyNav from "../../components/AgencyNav";
import { loadAgencyDepts } from "../../lib/agencyNav";
import Modal from "../../components/Modal";

const SVC_LABEL = { paid_media:"Paid Media", seo:"SEO", aso:"ASO", creative_strategy:"Creative Strategy", asset_production:"Asset Production", ugc:"UGC", tracking:"Tracking", dashboarding:"Dashboarding" };

export default function Feedback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [clients, setClients] = useState([]);
  const [fbQs, setFbQs] = useState([]);
  const [openClient, setOpenClient] = useState(null); // {id,name}
  const [subs, setSubs] = useState([]);
  const [detail, setDetail] = useState(null); // {sub, scores, answers}

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("full_name,email,side,is_super_admin").eq("id", uid).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      if (!prof?.is_super_admin) { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(uid, !!prof.is_super_admin));
      const { data: fq } = await supabase.from("feedback_questions").select("question_key,label,sort_order").order("sort_order");
      setFbQs(fq || []);
      const { data: ws } = await supabase.from("workspaces").select("id,name,phase,onboarding_complete,project_lead_id");
      const active = (ws || []).filter((w) => w.phase === "signed" && w.onboarding_complete && (prof.is_super_admin || w.project_lead_id === uid));
      setClients(active); setLoading(false);
    })();
  }, [router]);

  async function openFeedback(c) {
    setOpenClient(c); setDetail(null);
    const { data } = await supabase.from("feedback_submissions").select("id,overall_score,created_at").eq("workspace_id", c.id).order("created_at", { ascending: false });
    setSubs(data || []);
  }
  async function viewSub(sub) {
    const { data: scores } = await supabase.from("feedback_service_scores").select("service_key,score").eq("submission_id", sub.id);
    const { data: answers } = await supabase.from("feedback_answers").select("question_key,answer").eq("submission_id", sub.id);
    const [openQ] = [null];
    setDetail({ sub, scores: scores || [], answers: answers || [], openQ });
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Shell profile={profile} roleLabel={profile?.is_super_admin ? "Super admin" : "Team member"} nav={<AgencyNav profile={profile} active="feedback" depts={depts} />}>
      <div className="page-head"><h1 style={{ fontSize: 24 }}>Clients feedback</h1></div>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>Active clients you look after. Open a client to see their feedback history.</p>

      {clients.length === 0 ? <div className="empty">No active clients yet.</div>
        : clients.map((c) => (
          <div className="card" key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <b>{c.name}</b>
            <button className="btn btn-ghost" onClick={() => openFeedback(c)}>Feedback</button>
          </div>
        ))}

      {openClient && !detail && (
        <Modal title={`${openClient.name} — feedback history`} onClose={() => setOpenClient(null)}>
          {subs.length === 0 ? <div className="empty">No feedback submitted yet.</div>
            : subs.map((sub) => (
              <div className="card" key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div><b>{new Date(sub.created_at).toLocaleDateString()}</b>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Overall: {sub.overall_score ?? "—"}/10</div></div>
                <button className="btn btn-ghost" onClick={() => viewSub(sub)}>View feedback</button>
              </div>
            ))}
        </Modal>
      )}

      {detail && (
        <Modal title={`Feedback — ${new Date(detail.sub.created_at).toLocaleDateString()}`} onClose={() => setDetail(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Scores</h3>
              <div className="card" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}><b>Overall</b><b>{detail.sub.overall_score ?? "—"}/10</b></div>
              {detail.scores.map((s) => (
                <div className="card" key={s.service_key} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                  <span>{SVC_LABEL[s.service_key] || s.service_key}</span><b>{s.score ?? "—"}/10</b>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Answers</h3>
              <div className="faq">
                {fbQs.map((q) => {
                  const a = (detail.answers.find((x) => x.question_key === q.question_key)?.answer || "").trim();
                  const open = detail.openQ === q.question_key;
                  return (
                    <div className={"faq-item" + (open ? " open" : "")} key={q.question_key}>
                      <button type="button" className="faq-q" onClick={() => setDetail({ ...detail, openQ: open ? null : q.question_key })}>
                        <span>{q.label}</span><span className="faq-caret">{open ? "–" : "+"}</span>
                      </button>
                      {open && <div className="faq-a" style={{ color: a ? "var(--text)" : "var(--faint)" }}>{a || "No answer."}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => setDetail(null)}>← Back to history</button>
        </Modal>
      )}
    </Shell>
  );
}
