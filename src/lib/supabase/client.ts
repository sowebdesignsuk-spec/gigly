import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database";

/**
 * Supabase client for Client Components.
 *
 * Only ever sees the publishable key, so every query it makes is subject to the
 * RLS policies in supabase/migrations/*_rls_policies.sql. That is the intended
 * design (Section 2.1: no API server) — the database, not this file, decides
 * what a user may read.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
