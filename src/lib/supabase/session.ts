import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types/database";

/** Paths that require a session. Everything else is public. */
const PROTECTED_PREFIXES = [
  "/entertainer",
  "/venue",
  "/messages",
  "/settings",
  "/admin",
];

/** Where each account type belongs. Section 5, Week 1.8. */
export const HOME_FOR = {
  entertainer: "/entertainer/dashboard",
  venue: "/venue/dashboard",
} as const;

/**
 * Refreshes the auth session on every request and enforces role-based routing.
 *
 * Supabase access tokens are short-lived. Without this running in middleware,
 * a user with an expired token gets logged out mid-session even though their
 * refresh token is still perfectly good.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser(), not getSession(). getSession() reads the cookie and trusts it;
  // getUser() revalidates the token with Supabase. In middleware — the one
  // place deciding whether to let a request through — trusting a cookie the
  // client could have written is the whole vulnerability.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    // So we can send them back where they were headed after signing in.
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, onboarding_complete")
      .eq("id", user.id)
      .single();

    if (profile) {
      // A venue poking at /entertainer/* is sent to their own dashboard rather
      // than shown a 403. RLS already guarantees they would see nothing there;
      // this just avoids a confusing empty page.
      const wrongSide =
        (path.startsWith("/entertainer") && profile.account_type !== "entertainer") ||
        (path.startsWith("/venue") && profile.account_type !== "venue");

      if (wrongSide) {
        const home = request.nextUrl.clone();
        home.pathname = HOME_FOR[profile.account_type];
        home.search = "";
        return NextResponse.redirect(home);
      }

      if (path.startsWith("/admin")) {
        // role lives in profile_private, which a user can only read for
        // themselves — so this lookup is one extra query on /admin paths
        // only, never on the ordinary dashboards.
        const { data: priv } = await supabase
          .from("profile_private")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (priv?.role !== "admin") {
          const home = request.nextUrl.clone();
          home.pathname = HOME_FOR[profile.account_type];
          home.search = "";
          return NextResponse.redirect(home);
        }
      }
    }
  }

  // Signed-in users have no business on the login or signup pages.
  if (user && (path === "/login" || path === "/signup" || path === "/admin-login")) {
    const [{ data: profile }, { data: priv }] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("id", user.id).single(),
      supabase.from("profile_private").select("role").eq("user_id", user.id).maybeSingle(),
    ]);

    if (profile) {
      const home = request.nextUrl.clone();
      home.pathname = priv?.role === "admin" ? "/admin" : HOME_FOR[profile.account_type];
      home.search = "";
      return NextResponse.redirect(home);
    }
  }

  return response;
}
