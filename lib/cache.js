"use client";
// Tiny in-session cache so shared data (like the current profile) is fetched once
// per session instead of on every page navigation. Cleared on sign-out.
import { supabase } from "./supabase";

const _store = {}; // key -> { v, exp }
export function getCached(k) { const e = _store[k]; if (!e) return undefined; if (e.exp && Date.now() > e.exp) { delete _store[k]; return undefined; } return e.v; }
export function setCached(k, v, ttlMs) { _store[k] = { v, exp: ttlMs ? Date.now() + ttlMs : 0 }; }
export function clearCache() { for (const k in _store) delete _store[k]; }

let _pp = null;
export async function cachedProfile() {
  const c = getCached("profile"); if (c !== undefined) return c;
  if (_pp) return _pp;
  _pp = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { _pp = null; return null; }
    const { data } = await supabase.from("profiles").select("id,full_name,email,side,is_super_admin,home_service,home_department").eq("id", session.user.id).single();
    const p = data || { id: session.user.id, email: session.user.email, side: "agency" };
    setCached("profile", p, 5 * 60 * 1000);
    _pp = null;
    return p;
  })();
  return _pp;
}
