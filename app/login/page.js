"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        // If email confirmation is OFF (recommended for now), sign in straight away.
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) { setOk("Account created. Please check your email to confirm, then sign in."); setMode("signin"); return; }
        router.replace("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><span className="tile"><img src="/mark.png" alt="" /></span></div>
        <h1>{mode === "signin" ? "Sign in to Velvet" : "Create your account"}</h1>
        <div className="sub">Welcome Tomorrow</div>

        {err && <div className="auth-msg auth-err">{err}</div>}
        {ok && <div className="auth-msg auth-ok">{ok}</div>}

        {mode === "signup" && (
          <div className="field">
            <label>Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@welcometomorrow.io" />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <div className="auth-alt">
          {mode === "signin"
            ? <>No account yet? <b onClick={() => { setMode("signup"); setErr(""); }}>Create one</b></>
            : <>Already have an account? <b onClick={() => { setMode("signin"); setErr(""); }}>Sign in</b></>}
        </div>
      </form>
    </div>
  );
}
