import { createClient } from "@supabase/supabase-js";

// SERVER ONLY. Uses the service_role key for admin actions (invites, creating
// clients). This key bypasses row-level security, so every route that uses it
// MUST first verify the caller is allowed to do what they're asking.
export function admin() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
