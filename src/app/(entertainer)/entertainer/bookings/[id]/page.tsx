import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { BookingDetail } from "@/components/booking/booking-detail";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Booking" };

type Params = { params: Promise<{ id: string }> };

export default async function EntertainerBookingPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("mark_completed_bookings");

  const [{ data: profile }, { data: booking }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select(
        "id, status, agreed_fee, cancellation_reason, entertainer_notes, gigs(id, title, date, start_time, end_time, location_text, description, inclusions, requirements), venue_profiles(id, venue_name, user_id)",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!booking?.gigs || !booking.venue_profiles) notFound();

  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", booking.id)
    .eq("reviewer_id", user.id);

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <BookingDetail
          backHref="/entertainer/bookings"
          booking={{
            id: booking.id,
            status: booking.status,
            agreed_fee: booking.agreed_fee,
            cancellation_reason: booking.cancellation_reason,
            myNotes: booking.entertainer_notes,
            alreadyReviewed: (count ?? 0) > 0,
            gig: booking.gigs,
            counterparty: {
              name: booking.venue_profiles.venue_name,
              href: `/venues/${booking.venue_profiles.id}`,
              userId: booking.venue_profiles.user_id,
            },
          }}
        />
      </main>
    </>
  );
}
