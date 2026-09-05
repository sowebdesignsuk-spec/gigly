import Link from "next/link";

import { formatPence } from "@/lib/profile/constants";
import { daysUntil, formatGigDate, formatTimeRange } from "@/lib/utils/format";

export const BOOKING_STATUS: Record<string, { label: string; style: string }> = {
  confirmed: { label: "Confirmed", style: "bg-go/15 text-go" },
  completed: { label: "Completed", style: "bg-ink-700 text-chalk-dim" },
  cancelled_by_venue: { label: "Cancelled by venue", style: "bg-stop/15 text-stop" },
  cancelled_by_entertainer: { label: "Cancelled by act", style: "bg-stop/15 text-stop" },
  disputed: { label: "Disputed", style: "bg-hold/15 text-hold" },
};

export type BookingCardData = {
  id: string;
  status: string;
  agreed_fee: number;
  gig: { title: string; date: string; start_time: string; end_time: string | null; location_text: string };
  /** The other party's display name. */
  counterparty: string;
};

/** One booking in a list — Section 5, Week 5.8. */
export function BookingCard({ booking, href }: { booking: BookingCardData; href: string }) {
  const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.confirmed;
  const upcoming = booking.status === "confirmed";

  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-ink-700 bg-ink-800 p-5 transition-colors hover:border-hot-500"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}
            >
              {status.label}
            </span>
            <h3 className="text-base font-semibold text-chalk">{booking.gig.title}</h3>
            <p className="text-sm text-chalk-dim">{booking.counterparty}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-chalk">{formatPence(booking.agreed_fee)}</p>
            {upcoming ? (
              <p className="text-xs text-chalk-faint">{daysUntil(booking.gig.date)}</p>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-chalk-dim">
          {formatGigDate(booking.gig.date)} ·{" "}
          {formatTimeRange(booking.gig.start_time, booking.gig.end_time)} ·{" "}
          {booking.gig.location_text}
        </p>
      </Link>
    </li>
  );
}
