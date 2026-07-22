"use client";
import { createClient } from "@supabase/supabase-js";

// Reads the two values you set in .env.local (locally) and in your host's
// Environment Variables (in production). Safe in the browser because your
// database has Row-Level Security switched on.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
