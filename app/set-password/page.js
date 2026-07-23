"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SetPassword() {
  const router = useRouter();
  const [phase, setPhase] = useState("checking"); // checking | ready | nolink
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // When someone arrives from an invite / reset email, Supabase puts a token in
  // the URL and the client library turns it into a temporary session. We wait
  // for that session, then let them choose a password.
  useEffect(() => {
    let done = false;
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!done) { done = true; setEmail(data.session.user.email || ""); setPhase("ready"); }
      }
    }
    // supabase fires this once it has processed the link token
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !done) { done = true; setEmail(session.user.email || ""); setPhase("ready"); }
    });
    check();
    // if nothing arrives shortly, the link was missing/expired
    const t = setTimeout(() => { if (!done) setPhase("nolink"); }, 2500);
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  async function save(e) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) { setErr("Use at least 8 characters."); return; }
    if (pw !== pw2) { setErr("The two passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.replace("/dashboard");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><span className="tile"><img src="/mark.png" alt="" /></span></div>
        <h1>Set your password</h1>
        <div className="sub">Welcome Tomorrow</div>

        {phase === "checking" && <div className="auth-alt" style={{ marginTop: 20 }}>Checking your invite link…</div>}

        {phase === "nolink" && (
          <>
            <div className="auth-msg auth-err">This link is invalid or has expired. Ask an admin for a new invite, or use "Forgot password" on the sign-in page.</div>
            <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => router.replace("/login")}>Back to sign in</button>
          </>
        )}

        {phase === "ready" && (
          <form onSubmit={save}>
            {email && <div className="auth-alt" style={{ marginBottom: 14 }}>Setting the password for <b>{email}</b></div>}
            {err && <div className="auth-msg auth-err">{err}</div>}
            <div className="field">
              <label>New password</label>
              <input className="input" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input className="input" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={busy}>
              {busy ? "Saving…" : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
