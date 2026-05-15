/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/data/db.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud during development so misconfigured envs are obvious.
  console.warn(
    "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — auth and data calls will fail. Copy .env.local.example to .env.local and fill in the values from `npx supabase status`.",
  );
}

export const supabase = createClient<Database>(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseClient = typeof supabase;
