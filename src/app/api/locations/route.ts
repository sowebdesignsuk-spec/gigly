import { NextResponse, type NextRequest } from "next/server";

import { resolveLocation } from "@/lib/utils/postcode";

/**
 * Location autocomplete for the profile forms.
 *
 * Proxied through our own origin rather than called from the browser so the
 * upstream response can be cached by Next's fetch cache — postcode coordinates
 * do not change, and every user typing "manchester" should not become a
 * separate request to postcodes.io.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await resolveLocation(query);
    return NextResponse.json({ results });
  } catch {
    // A lookup service being down should degrade to "no suggestions", not to a
    // form the user cannot submit.
    return NextResponse.json({ results: [] });
  }
}
