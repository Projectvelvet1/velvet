"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import ClientView from "../../../components/ClientView";

export default function ClientMirror() {
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

  return <ClientView workspace={ws} services={services} viewingAs onBack={() => router.push(ws.phase === "prospect" ? "/prospects" : "/clients")} />;
}
