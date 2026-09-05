import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Start (or resume) a conversation — Section 5, Week 6.3 and 6.4.
 *
 * A GET so it can be a plain link from a profile, a gig, or a booking:
 *   /messages/new?to=<user id>&gig=<gig id>&booking=<booking id>
 *
 * get_or_create_conversation enforces one thread per pair per gig, so
 * clicking "Message" twice lands in the same place.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname, search } = request.nextUrl;
  const to = searchParams.get("to") ?? "";
  const gig = searchParams.get("gig");
  const booking = searchParams.get("booking");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", origin);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (!UUID.test(to) || to === user.id) {
    return NextResponse.redirect(new URL("/messages", origin));
  }

  const { data: conversationId, error } = await supabase.rpc("get_or_create_conversation", {
    p_other_user: to,
    p_gig_id: gig && UUID.test(gig) ? gig : undefined,
    p_booking_id: booking && UUID.test(booking) ? booking : undefined,
  });

  if (error || !conversationId) {
    return NextResponse.redirect(new URL("/messages?error=start", origin));
  }

  return NextResponse.redirect(new URL(`/messages/${conversationId}`, origin));
}
