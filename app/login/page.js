"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setNote(""); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/dashboard");
    } catch (e) {
      setErr(e.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setErr(""); setNote("");
    if (!email || !email.includes("@")) { setErr("Type your email above first, then click Forgot password."); return; }
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/set-password` });
    if (error) { setErr(error.message); return; }
    setNote("If that email has an account, a reset link is on its way. Check your inbox.");
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><span className="tile"><img src="/mark.png" alt="" /></span></div>
        <h1>Sign in to Velvet</h1>
        <div className="sub">Welcome Tomorrow</div>

        {err && <div className="auth-msg auth-err">{err}</div>}
        {note && <div className="auth-msg auth-ok">{note}</div>}

        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@welcometomorrow.io" />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </div>

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={busy}>
          {busy ? "Please wait…" : "Sign in"}
        </button>

        <div className="auth-alt" style={{ marginTop: 14 }}>
          <b onClick={forgot} style={{ cursor: "pointer" }}>Forgot password?</b>
        </div>
        <div className="auth-alt" style={{ marginTop: 6 }}>Velvet is invite-only. Ask an admin for an invite.</div>
      </form>
    </div>
  );
}
