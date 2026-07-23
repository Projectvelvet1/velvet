"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name,email,side,is_super_admin")
        .eq("id", session.user.id)
        .single();
      setProfile(prof || { email: session.user.email, side: "agency" });

      // RLS returns only the workspaces this person is allowed to see.
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id,name,is_demo,onboarding_complete")
        .order("created_at", { ascending: true });
      setWorkspaces(ws || []);
      setLoading(false);
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return <div className="center">Loading your workspace…</div>;

  const isAgency = profile?.side === "agency";
  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0].split("@")[0];

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="t"><img src="/mark.png" alt="" /></span><b>Velvet</b></div>

        {isAgency ? (
          <>
            <div className="grp">Work</div>
            <nav className="nav"><a className="on">Action plan</a><a>My work</a><a onClick={() => router.push("/clients")} style={{cursor:"pointer"}}>Clients</a><a onClick={() => router.push("/invite")} style={{cursor:"pointer"}}>Invite people</a></nav>
            <div className="grp">Performance</div>
            <nav className="nav"><a>Paid Media</a><a>SEO</a><a>ASO</a></nav>
            <div className="grp">Team</div>
            <nav className="nav"><a>Replays</a><a>Reports &amp; docs</a></nav>
          </>
        ) : (
          <>
            <div className="grp">Piloting</div>
            <nav className="nav"><a className="on">Roadmap</a><a>Performance</a><a>Analytics</a></nav>
            <div className="grp">Account</div>
            <nav className="nav"><a>Team</a><a>Onboarding</a></nav>
          </>
        )}

        <div className="who">
          <b>{profile?.full_name || profile?.email}</b>
          {profile?.is_super_admin ? "Super admin" : isAgency ? "Team member" : "Client"}
          <br /><button className="signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1 style={{ fontSize: 24 }}>Welcome back, {firstName}</h1>
          <span className={"pill " + (isAgency ? "p-agency" : "p-client")}>
            {isAgency ? "Agency side" : "Client side"}
          </span>
        </div>

        <div className="card">
          <b>You're signed in.</b>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>
            Side was detected automatically from your email, and this list below is filtered by the
            database security rules — you only see clients you're a member of.
          </p>
        </div>

        <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>
          {isAgency ? "Clients you can see" : "Your workspace"}
        </h3>

        {workspaces.length === 0 ? (
          <div className="empty">
            No clients yet.<br />
            {profile?.is_super_admin
              ? "As super admin, add one in Supabase → Table Editor → workspaces, then a membership row linking you to it."
              : "You haven't been added to any client yet."}
          </div>
        ) : (
          workspaces.map((w) => (
            <div className="card" key={w.id}>
              <b>{w.name}</b>{" "}
              {w.is_demo && <span className="pill p-agency" style={{ marginLeft: 6 }}>demo</span>}
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                {w.onboarding_complete ? "Onboarding complete" : "Onboarding pending"}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
