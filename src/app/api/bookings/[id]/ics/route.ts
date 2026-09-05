import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Calendar export — Section 5, Week 5.2 "Add to Calendar (ICS download)".
 *
 * RLS on bookings restricts this to the two parties, so an unauthenticated or
 * unrelated request finds no booking and gets a 404.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, agreed_fee, status, gigs(title, date, start_time, end_time, location_text, description), venue_profiles(venue_name, address_line_1, city, postcode)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!booking?.gigs) {
    return new NextResponse("Not found", { status: 404 });
  }

  const gig = booking.gigs;
  const venue = booking.venue_profiles;

  // Local wall-clock time in Europe/London, which is what the venue meant.
  const start = `${gig.date.replace(/-/g, "")}T${gig.start_time.slice(0, 5).replace(":", "")}00`;
  const end = gig.end_time
    ? `${gig.date.replace(/-/g, "")}T${gig.end_time.slice(0, 5).replace(":", "")}00`
    : null;

  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const location = venue
    ? [venue.venue_name, venue.address_line_1, venue.city, venue.postcode].filter(Boolean).join(", ")
    : gig.location_text;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GIGLY//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}@gigly`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/London:${start}`,
    end ? `DTEND;TZID=Europe/London:${end}` : null,
    `SUMMARY:${escape(gig.title)}`,
    `LOCATION:${escape(location)}`,
    `DESCRIPTION:${escape(`${gig.description}\n\nAgreed fee: £${(booking.agreed_fee / 100).toFixed(2)}\nBooked through GIGLY.`)}`,
    booking.status === "confirmed" ? "STATUS:CONFIRMED" : "STATUS:CANCELLED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="gigly-${gig.date}.ics"`,
    },
  });
}
