import Link from "next/link";

import { BOOKING_STATUS } from "@/components/booking/booking-card";
import { ReviewForm } from "@/components/booking/review-form";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { cancelBooking, saveBookingNotes } from "@/lib/bookings/actions";
import { formatPence } from "@/lib/profile/constants";
import { formatGigDateLong, formatTimeRange } from "@/lib/utils/format";

export type BookingDetailData = {
  id: string;
  status: string;
  agreed_fee: number;
  cancellation_reason: string | null;
  myNotes: string | null;
  alreadyReviewed: boolean;
  gig: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string | null;
    location_text: string;
    description: string;
    inclusions: string | null;
    requirements: string | null;
  };
  counterparty: { name: string; href: string; userId: string };
};

/**
 * Booking detail, shared by both roles — Section 5, Week 5.2 and 5.7.
 * The caller decides which side it is and passes the right notes column.
 */
export function BookingDetail({ booking, backHref }: { booking: BookingDetailData; backHref: string }) {
  const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.confirmed;
  const live = booking.status === "confirmed";
  const done = booking.status === "completed";

  return (
    <>
      <Link href={backHref} className="text-sm text-chalk-dim hover:text-chalk">
        ← Bookings
      </Link>

      <div className="mt-4 space-y-2">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>
          {status.label}
        </span>
        <h1 className="text-3xl font-bold">{booking.gig.title}</h1>
        <p className="text-sm text-chalk-dim">
          with{" "}
          <Link href={booking.counterparty.href} className="text-hot-500 hover:text-hot-400">
            {booking.counterparty.name}
          </Link>
        </p>
      </div>

      {booking.cancellation_reason ? (
        <p className="mt-6 rounded-xl border border-stop/40 bg-stop/10 px-4 py-3 text-sm text-stop">
          Reason given: {booking.cancellation_reason}
        </p>
      ) : null}

      <dl className="mt-8 grid gap-4 rounded-xl border border-ink-700 bg-ink-800 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs tracking-wide text-chalk-faint uppercase">Date</dt>
          <dd className="mt-1 text-sm font-medium text-chalk">{formatGigDateLong(booking.gig.date)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-chalk-faint uppercase">Time</dt>
          <dd className="mt-1 text-sm font-medium text-chalk">
            {formatTimeRange(booking.gig.start_time, booking.gig.end_time)}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-chalk-faint uppercase">Agreed fee</dt>
          <dd className="mt-1 text-sm font-medium text-chalk">{formatPence(booking.agreed_fee)}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-xs tracking-wide text-chalk-faint uppercase">Where</dt>
          <dd className="mt-1 text-sm font-medium text-chalk">{booking.gig.location_text}</dd>
        </div>
      </dl>

      {live ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={`/api/bookings/${booking.id}/ics`}
            className="rounded-xl bg-ink-700 px-5 py-3 text-sm font-semibold text-chalk hover:bg-ink-600"
          >
            Add to calendar
          </a>
          <Link
            href={`/messages/new?to=${booking.counterparty.userId}&gig=${booking.gig.id}&booking=${booking.id}`}
            className="rounded-xl bg-ink-700 px-5 py-3 text-sm font-semibold text-chalk hover:bg-ink-600"
          >
            Message {booking.counterparty.name}
          </Link>
          <Link href={`/gigs/${booking.gig.id}`} className="self-center px-2 text-sm text-chalk-dim hover:text-chalk">
            View listing
          </Link>
        </div>
      ) : null}

      {booking.gig.inclusions ? (
        <section className="mt-8 space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">Venue provides</h2>
          <p className="text-sm whitespace-pre-line text-chalk-dim">{booking.gig.inclusions}</p>
        </section>
      ) : null}

      {booking.gig.requirements ? (
        <section className="mt-8 space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">Requirements</h2>
          <p className="text-sm whitespace-pre-line text-chalk-dim">{booking.gig.requirements}</p>
        </section>
      ) : null}

      <form action={saveBookingNotes} className="mt-8 space-y-3">
        <input type="hidden" name="booking_id" value={booking.id} />
        <Field htmlFor="notes" label="Your private notes" hint="Only you can see these.">
          <Textarea id="notes" name="notes" defaultValue={booking.myNotes ?? ""} className="min-h-24" />
        </Field>
        <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
          Save notes
        </Button>
      </form>

      {done && !booking.alreadyReviewed ? (
        <div className="mt-8">
          <ReviewForm bookingId={booking.id} whom={booking.counterparty.name} />
        </div>
      ) : null}

      {live ? (
        <details className="mt-10 rounded-xl border border-ink-700 bg-ink-800 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-stop">
            Cancel this booking
          </summary>
          <form action={cancelBooking} className="mt-4 space-y-3">
            <input type="hidden" name="booking_id" value={booking.id} />
            <p className="text-sm text-chalk-dim">
              {booking.counterparty.name} will be told straight away, with your reason. Cancellations
              are recorded against your profile.
            </p>
            <Field htmlFor="reason" label="Why?" hint="Required. Be straight about it.">
              <Textarea id="reason" name="reason" required minLength={5} className="min-h-20" />
            </Field>
            <Button type="submit" variant="secondary" className="px-4 py-2 text-xs text-stop">
              Confirm cancellation
            </Button>
          </form>
        </details>
      ) : null}
    </>
  );
}
