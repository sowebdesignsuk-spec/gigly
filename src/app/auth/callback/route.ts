import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { HOME_FOR } from "@/lib/supabase/session";

/**
 * Landing point for every emailed auth link — signup confirmation and password
 * recovery both come back here with a `code` to exchange for a session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired or already-used link. Both are ordinary, not alarming.
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  // Same open-redirect guard as the login action: only same-site paths.
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  return NextResponse.redirect(
    `${origin}${profile ? HOME_FOR[profile.account_type] : "/"}`,
  );
}
