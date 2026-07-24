"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Shell({ profile, roleLabel, nav, children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); }
  return (
    <div className="shell">
      <div className="mtop">
        <button className="burger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
        <span className="t" style={{ width: 26, height: 26, borderRadius: 7, background: "var(--grad-mark)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/mark.png" alt="" style={{ width: 16 }} />
        </span>
        <b>Velvet</b>
      </div>

      <div className={"scrim " + (open ? "" : "hide")} onClick={() => setOpen(false)} />

      <aside className={"side " + (open ? "open" : "")}>
        <div className="brand"><span className="t"><img src="/mark.png" alt="" /></span><b>Velvet</b></div>
        <div onClick={() => setOpen(false)}>{nav}</div>
        <div className="who">
          <b>{profile?.full_name || profile?.email}</b>
          {roleLabel}
          <br /><button className="signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
