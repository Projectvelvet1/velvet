import { createClient } from "@supabase/supabase-js";

// SERVER ONLY. Uses the secret key, which must never reach the browser.
// It bypasses row-level security, so every route that uses it MUST first
// verify the caller is allowed to do what they're asking.
export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
