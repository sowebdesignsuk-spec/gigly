import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BookingCard } from "@/components/booking/booking-card";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bookings" };

/** Venue's bookings — Section 5, Week 5.8. */
export default async function VenueBookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("mark_completed_bookings");

  const [{ data: profile }, { data: venue }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("venue_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const { data: rows } = venue
    ? await supabase
        .from("bookings")
        .select(
          "id, status, agreed_fee, gigs(title, date, start_time, end_time, location_text), entertainer_profiles(stage_name)",
        )
        .eq("venue_id", venue.id)
    : { data: [] };

  const bookings = (rows ?? [])
    .filter((b) => b.gigs)
    .map((b) => ({
      id: b.id,
      status: b.status,
      agreed_fee: b.agreed_fee,
      gig: b.gigs!,
      counterparty: b.entertainer_profiles?.stage_name ?? "Act",
    }));

  const upcoming = bookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.gig.date.localeCompare(b.gig.date));
  const past = bookings
    .filter((b) => b.status !== "confirmed")
    .sort((a, b) => b.gig.date.localeCompare(a.gig.date));

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-sm text-chalk-dim">
            {upcoming.length > 0
              ? `${upcoming.length} act${upcoming.length === 1 ? "" : "s"} booked.`
              : "Accepted offers land here."}
          </p>
        </div>

        {upcoming.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} href={`/venue/bookings/${b.id}`} />
            ))}
          </ul>
        ) : null}

        {past.length > 0 ? (
          <>
            <h2 className="mt-10 text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              Past and cancelled
            </h2>
            <ul className="mt-3 space-y-3">
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} href={`/venue/bookings/${b.id}`} />
              ))}
            </ul>
          </>
        ) : null}

        {bookings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">No bookings yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Make an offer to an applicant on one of your gigs. When they accept, it lands here.
            </p>
            <Link
              href="/venue/gigs"
              className="mt-4 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
            >
              My gigs
            </Link>
          </div>
        ) : null}
      </main>
    </>
  );
}
