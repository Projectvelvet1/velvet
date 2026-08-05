"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Shell from "../../../components/Shell";
import AgencyNav from "../../../components/AgencyNav";
import { loadAgencyDepts } from "../../../lib/agencyNav";

export default function OnboardingAnswers() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [sel, setSel] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  async function tok() { const { data } = await supabase.auth.getSession(); return data.session?.access_token; }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency" || !prof?.is_super_admin) { router.replace("/dashboard"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, true));
      const { data: ws } = await supabase.from("workspaces").select("id,name,phase").order("name");
      setClients((ws || []).filter((w) => w.phase === "signed"));
      setProspects((ws || []).filter((w) => w.phase === "prospect"));
      setLoading(false);
    })();
  }, [router]);

  async function pick(id) {
    setSel(id); setData(null); if (!id) return;
    setBusy(true);
    const r = await fetch(`/api/onboarding-answers?workspaceId=${id}`, { headers: { Authorization: `Bearer ${await tok()}` } });
    const j = await r.json(); setBusy(false);
    if (j.ok) setData(j);
  }

  // walk form + answers into printable sections
  function buildQA(form, answers) {
    return (form || []).map((s) => ({
      title: s.title,
      items: (s.questions || []).flatMap((q) => {
        if (q.type === "contact") return (q.fields || []).map(([sub, subLabel]) => ({ label: `${q.label} — ${subLabel}`, value: answers[`${q.key}_${sub}`] || "—" }));
        if (q.type === "ack") return [{ label: q.label, value: answers[q.key] === "Acknowledged" ? "Acknowledged" : "Not acknowledged" }];
        return [{ label: q.label, value: answers[q.key] || "—" }];
      }),
    }));
  }
  function docHtml() {
    if (!data) return "";
    const qa = buildQA(data.form, data.answers);
    const rows = qa.map((s) => `<h2 style="font-family:Arial;font-size:15px;color:#0B0D12;border-bottom:2px solid #F7C948;padding-bottom:4px;margin-top:22px;">${s.title}</h2>` +
      s.items.map((it) => `<p style="font-family:Arial;font-size:12px;margin:10px 0;"><b style="color:#444;">${it.label}</b><br/>${String(it.value).replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`).join("")
    ).join("");
    return `<div style="max-width:720px;margin:0 auto;"><h1 style="font-family:Arial;font-size:22px;color:#0B0D12;">${data.clientName} — Onboarding answers</h1><div style="font-family:Arial;font-size:11px;color:#888;">Welcome Tomorrow · generated ${new Date().toLocaleDateString()}</div>${rows}</div>`;
  }
  function downloadWord() {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${docHtml()}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${data.clientName.replace(/[^a-z0-9]+/gi, "-")}-onboarding.doc`; a.click(); URL.revokeObjectURL(a.href);
  }
  function printPdf() {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${data.clientName} onboarding</title></head><body>${docHtml()}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  if (loading) return <div className="center">Loading…</div>;
  const nav = <AgencyNav profile={profile} active="settings" depts={depts} />;
  const qa = data ? buildQA(data.form, data.answers) : [];

  return (
    <Shell profile={profile} roleLabel="Super admin" nav={nav}>
      <div className="page-head"><div><span onClick={() => router.push("/settings")} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 13 }}>← Settings</span><h1 style={{ fontSize: 24, marginTop: 2 }}>Onboarding answers</h1></div></div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Choose a client</label>
        <select className="input" style={{ marginTop: 8 }} value={sel} onChange={(e) => pick(e.target.value)}>
          <option value="">Select…</option>
          {clients.length > 0 && <optgroup label="Current clients">{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
          {prospects.length > 0 && <optgroup label="Future clients">{prospects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
        </select>
        <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>Download the answers with their questions, then store the file in that client's Documents for the team.</div>
      </div>

      {busy && <div className="card">Loading answers…</div>}

      {data && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={downloadWord}>Download (Word)</button>
            <button className="btn btn-ghost" onClick={printPdf}>Print / Save as PDF</button>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 2 }}>{data.clientName}</h2>
            <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 8 }}>Onboarding answers</div>
            {qa.map((s, i) => (
              <div key={i} style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "2px solid #F7C948", paddingBottom: 4 }}>{s.title}</div>
                {s.items.map((it, j) => (
                  <div key={j} style={{ margin: "10px 0" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{it.label}</div>
                    <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{it.value}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
