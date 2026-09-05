"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { AvailabilitySlot, AvailabilityStatus } from "@/lib/types/database";

/**
 * Section 5, Week 5.9 — cancel a booking with a reason.
 *
 * Which side is cancelling is taken from the caller's account type, never
 * from the form: a venue cannot record a cancellation as the act's fault.
 * The bookings_cancellation_reason constraint refuses a cancellation without
 * a reason, and the on_booking_change trigger frees the date and notifies
 * the other party.
 */
export async function cancelBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!bookingId || reason.length < 5) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (!profile) return;

  await supabase
    .from("bookings")
    .update({
      status: profile.account_type === "venue" ? "cancelled_by_venue" : "cancelled_by_entertainer",
      cancellation_reason: reason,
    })
    .eq("id", bookingId)
    .eq("status", "confirmed");

  revalidatePath("/entertainer/bookings");
  revalidatePath("/venue/bookings");
  revalidatePath("/entertainer/diary");
}

/** Private notes — each side has its own column and RLS lets both update the row. */
export async function saveBookingNotes(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!bookingId) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  const patch =
    profile?.account_type === "venue"
      ? { venue_notes: notes || null }
      : { entertainer_notes: notes || null };

  await supabase.from("bookings").update(patch).eq("id", bookingId);

  revalidatePath(`/entertainer/bookings/${bookingId}`);
  revalidatePath(`/venue/bookings/${bookingId}`);
}

const SLOTS: AvailabilitySlot[] = ["all_day", "morning", "afternoon", "evening"];
const SETTABLE: AvailabilityStatus[] = ["available", "unavailable", "held"];

/** Section 5, Week 5.6 — entertainer marks a date. 'booked' is trigger-only. */
export async function setAvailability(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const slot = String(formData.get("time_slot") ?? "all_day") as AvailabilitySlot;
  const status = String(formData.get("status") ?? "") as AvailabilityStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const month = String(formData.get("month") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOTS.includes(slot)) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: entertainer } = await supabase
    .from("entertainer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entertainer) return;

  if (status === ("clear" as string)) {
    // Clearing a day means "no opinion" — which is what no row means.
    await supabase
      .from("availability")
      .delete()
      .eq("entertainer_id", entertainer.id)
      .eq("date", date)
      .eq("time_slot", slot)
      .neq("status", "booked");
  } else if (SETTABLE.includes(status)) {
    // A booked slot cannot be overwritten from here; the unique index plus the
    // WHERE on the upsert's conflict target keeps the trigger's row intact.
    const { data: existing } = await supabase
      .from("availability")
      .select("status")
      .eq("entertainer_id", entertainer.id)
      .eq("date", date)
      .eq("time_slot", slot)
      .maybeSingle();

    if (existing?.status === "booked") return;

    await supabase
      .from("availability")
      .upsert(
        { entertainer_id: entertainer.id, date, time_slot: slot, status, notes },
        { onConflict: "entertainer_id,date,time_slot" },
      );
  }

  revalidatePath(month ? `/entertainer/diary?month=${month}` : "/entertainer/diary");
  revalidatePath("/entertainer/diary");
}

/** Section 5, Week 8.1 — review after a completed booking. */
export type ReviewState = { error?: string; success?: string };

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const bookingId = String(formData.get("booking_id") ?? "");
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();

  if (!bookingId) return { error: "That booking no longer exists." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a star rating." };
  }
  if (body.length > 500) return { error: "Keep it under 500 characters." };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  // Work out who is being reviewed: the other party on the booking.
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, venue_profiles(user_id), entertainer_profiles(user_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { error: "That booking isn't yours to review." };
  if (booking.status !== "completed") {
    return { error: "You can review once the gig has happened." };
  }

  const venueUser = booking.venue_profiles?.user_id;
  const actUser = booking.entertainer_profiles?.user_id;
  const reviewed = user.id === venueUser ? actUser : venueUser;

  if (!reviewed) return { error: "Couldn't work out who you're reviewing." };

  const { error } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    reviewer_id: user.id,
    reviewed_user_id: reviewed,
    rating,
    body: body || null,
  });

  if (error) {
    if (error.code === "23505") return { success: "You've already reviewed this booking." };
    return { error: error.message };
  }

  revalidatePath(`/entertainer/bookings/${bookingId}`);
  revalidatePath(`/venue/bookings/${bookingId}`);

  return { success: "Review posted. Thank you." };
}
