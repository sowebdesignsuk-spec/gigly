import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types/database";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Must be created per-request, never hoisted to a module-level constant: it
 * closes over this request's cookies, and sharing one across requests would
 * leak one user's session into another's response.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Harmless here: the
            // middleware refreshes the session on every request, so the
            // refreshed token is already on its way to the browser.
          }
        },
      },
    },
  );
}
