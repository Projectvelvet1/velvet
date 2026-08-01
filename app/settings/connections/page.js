"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Shell from "../../../components/Shell";
import AgencyNav from "../../../components/AgencyNav";
import { loadAgencyDepts } from "../../../lib/agencyNav";

export default function Connections() {
  const router = useRouter();
  const [flash, setFlash] = useState({ connected: false, error: "" });
  const [profile, setProfile] = useState(null);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function refreshStatus() {
    const { data: sess } = await supabase.auth.getSession();
    const r = await fetch("/api/gsc/status", { headers: { Authorization: `Bearer ${sess.session?.access_token}` } });
    setStatus(await r.json());
  }

  useEffect(() => {
    try { const p = new URLSearchParams(window.location.search); setFlash({ connected: !!p.get("connected"), error: p.get("error") || "" }); } catch {}
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin").eq("id", session.user.id).single();
      if (prof?.side !== "agency") { router.replace("/dashboard"); return; }
      if (!prof?.is_super_admin) { router.replace("/settings"); return; }
      setProfile(prof);
      setDepts(await loadAgencyDepts(session.user.id, true));
      await refreshStatus();
      setLoading(false);
    })();
  }, [router]);

  async function connect() {
    setBusy(true); setErr("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/gsc/connect", { method: "POST", headers: { Authorization: `Bearer ${sess.session?.access_token}` } });
      const j = await r.json(); setBusy(false);
      if (!r.ok) { setErr(j.error || "Could not start the connection."); return; }
      window.location.href = j.url;
    } catch (e) { setBusy(false); setErr("Could not start the connection."); }
  }

  if (loading) return <div className="center">Loading…</div>;
  const nav = <AgencyNav profile={profile} active="settings" depts={depts} />;
  const connected = status?.connected;

  return (
    <Shell profile={profile} roleLabel="Super admin" nav={nav}>
      <div className="page-head"><div><span onClick={() => router.push("/settings")} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 13 }}>← Settings</span><h1 style={{ fontSize: 24, marginTop: 2 }}>Data connections</h1></div></div>

      {flash.connected && <div className="auth-msg auth-ok" style={{ marginBottom: 12 }}>Google Search Console connected.</div>}
      {flash.error && <div className="auth-msg auth-err" style={{ marginBottom: 12 }}>Connection didn't finish ({flash.error}). Please try again.</div>}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>Google Search Console</b>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {connected ? `Connected as ${status.email || "your Google account"}. Match each client to its property on their SEO page.` : "Connect the agency Google account that holds all your clients' Search Console properties."}
            </div>
          </div>
          <span className="pill p-agency">{connected ? "connected" : "not connected"}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={connect} disabled={busy}>{busy ? "Opening Google…" : connected ? "Reconnect Google" : "Connect Google Search Console"}</button>
        </div>
        {err && <div className="auth-msg auth-err" style={{ marginTop: 10 }}>{err}</div>}
      </div>

      <div className="card" style={{ marginTop: 12, opacity: 0.7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Google Ads, Meta, TikTok, LinkedIn, GA4</b><span className="pill p-agency">coming soon</span></div>
        <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 6 }}>These connect when we build the Paid Media and Analytics dashboards.</div>
      </div>
    </Shell>
  );
}
