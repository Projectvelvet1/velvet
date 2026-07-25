"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const DEPT = { performance: "Performance", content: "Content", analytics: "Analytics" };

export default function ClientView() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const res = await fetch(`/api/client-context?id=${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Not allowed"); setLoading(false); return; }
      setWs(j.workspace); setServices(j.services || []); setLoading(false);
    })();
  }, [id, router]);

  if (loading) return <div className="center">Loading…</div>;
  if (error) return (
    <div className="center" style={{ flexDirection: "column", gap: 12 }}>
      <div>{error}</div>
      <button className="btn btn-ghost" onClick={() => router.push("/clients")}>← Back to clients</button>
    </div>
  );

  const onboarded = !!ws.onboarding_complete;
  return (
    <div style={{ minHeight: "100vh", background: "var(--cloud)" }}>
      <div style={{ background: "var(--ink)", backgroundImage: "var(--grid)", color: "#fff", padding: "14px 0" }}>
        <div className="wrap" style={{ maxWidth: 900, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tile" style={{ width: 30, height: 30, borderRadius: 8 }}><img src="/mark.png" alt="" style={{ width: 19 }} /></span>
            <div><b style={{ fontSize: 14 }}>Viewing as {ws.name}</b>
              <div style={{ fontSize: 11, color: "var(--on-dark-mut)" }}>Agency view · you can act on this client's behalf</div></div>
          </div>
          <button className="btn btn-ghost" style={{ color: "#fff", borderColor: "var(--line-dark)" }} onClick={() => router.push(ws.phase === "prospect" ? "/prospects" : "/clients")}>← Back</button>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 900, paddingTop: 24 }}>
        <div className="page-head"><h1 style={{ fontSize: 24 }}>{ws.name}</h1>
          <span className="pill p-agency">{ws.phase}</span>
        </div>

        <div className="card" style={{ borderColor: "var(--border-accent)" }}>
          <b>{ws.phase === "prospect" ? "Discovery onboarding" : "Client onboarding"}</b>
          <p style={{ color: "var(--muted)", margin: "6px 0 12px", fontSize: 14 }}>
            {ws.phase === "prospect"
              ? (ws.discovery_complete ? "Discovery has been completed." : "Fill in the discovery questions on this client's behalf.")
              : (onboarded ? "Onboarding has been completed." : "Fill in onboarding on this client's behalf.")}
          </p>
          <button className="btn btn-primary" onClick={() => router.push(`/onboarding?ws=${ws.id}`)}>
            {ws.phase === "prospect"
              ? (ws.discovery_complete ? "Review discovery answers" : "Open discovery onboarding")
              : (onboarded ? "Review onboarding" : "Open onboarding")}
          </button>
        </div>

        {ws.phase !== "prospect" && (
          <>
            <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Services</h3>
            {services.length === 0 ? <div className="empty">No services recorded.</div>
              : services.map((s) => (
                <div className={"card svc-card svc svc-" + s.service_key} key={s.service_key}>
                  <b>{s.service_label}</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{DEPT[s.department]}</div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
