import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BookingCard } from "@/components/booking/booking-card";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bookings" };

/** Entertainer's bookings — Section 5, Week 5.7. */
export default async function EntertainerBookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Lazy completion: anything whose date has passed becomes 'completed' now.
  await supabase.rpc("mark_completed_bookings");

  const [{ data: profile }, { data: entertainer }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("entertainer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const { data: rows } = entertainer
    ? await supabase
        .from("bookings")
        .select(
          "id, status, agreed_fee, gigs(title, date, start_time, end_time, location_text), venue_profiles(venue_name)",
        )
        .eq("entertainer_id", entertainer.id)
    : { data: [] };

  const bookings = (rows ?? [])
    .filter((b) => b.gigs)
    .map((b) => ({
      id: b.id,
      status: b.status,
      agreed_fee: b.agreed_fee,
      gig: b.gigs!,
      counterparty: b.venue_profiles?.venue_name ?? "Venue",
    }));

  const upcoming = bookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.gig.date.localeCompare(b.gig.date));
  const past = bookings
    .filter((b) => b.status !== "confirmed")
    .sort((a, b) => b.gig.date.localeCompare(a.gig.date));

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Bookings</h1>
            <p className="text-sm text-chalk-dim">
              {upcoming.length > 0
                ? `${upcoming.length} coming up.`
                : "Nothing confirmed yet. Accepted offers land here."}
            </p>
          </div>
          <Link href="/entertainer/diary" className="text-sm text-hot-500 hover:text-hot-400">
            Open diary →
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} href={`/entertainer/bookings/${b.id}`} />
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
                <BookingCard key={b.id} booking={b} href={`/entertainer/bookings/${b.id}`} />
              ))}
            </ul>
          </>
        ) : null}

        {bookings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">No bookings yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              When a venue makes you an offer and you accept it, it appears here with the date
              blocked in your diary.
            </p>
            <Link
              href="/gigs"
              className="mt-4 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
            >
              Find gigs
            </Link>
          </div>
        ) : null}
      </main>
    </>
  );
}
