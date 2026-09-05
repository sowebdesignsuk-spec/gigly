import type { Metadata } from "next";

import { BOOKING_STATUS } from "@/components/booking/booking-card";
import { createClient } from "@/lib/supabase/server";
import { formatPence } from "@/lib/profile/constants";
import { formatGigDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Bookings · Admin" };

/**
 * Booking oversight.
 *
 * Read-only on purpose. A booking is an agreement between two other people
 * and the money that goes with it; an admin needs to be able to see one to
 * answer a dispute, and should not be able to quietly alter its terms. If a
 * booking genuinely has to be undone, that is a conversation with both
 * parties, not a button.
 */
export default async function AdminBookingsPage() {
  const supabase = await createClient();

  await supabase.rpc("mark_completed_bookings");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, agreed_fee, cancellation_reason, created_at, gigs(title, date), venue_profiles(venue_name), entertainer_profiles(stage_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = bookings ?? [];

  const gmv = rows
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + b.agreed_fee, 0);
  const cancelled = rows.filter((b) => b.status.startsWith("cancelled")).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="max-w-2xl text-sm text-chalk-dim">
          Read-only. A booking is an agreement between two other people — you can see one to
          settle a dispute, but altering its terms behind their backs is not a button that
          should exist.
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-2xl font-bold text-chalk tabular-nums">{formatPence(gmv)}</p>
            <p className="text-xs tracking-wide text-chalk-faint uppercase">
              booked value, confirmed and completed
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-chalk tabular-nums">{rows.length}</p>
            <p className="text-xs tracking-wide text-chalk-faint uppercase">bookings</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-chalk tabular-nums">{cancelled}</p>
            <p className="text-xs tracking-wide text-chalk-faint uppercase">cancelled</p>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-ink-700 bg-ink-800 p-6">
          <p className="font-semibold text-chalk">No bookings yet</p>
          <p className="mt-1 text-sm text-chalk-dim">
            One appears the moment an act accepts an offer.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-700">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-ink-800 text-left text-xs tracking-wide text-chalk-faint uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Gig</th>
                <th className="px-4 py-3 font-semibold">Parties</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {rows.map((b) => {
                const status = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.confirmed;
                return (
                  <tr key={b.id} className="align-top">
                    <td className="px-4 py-3 text-chalk">{b.gigs?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-chalk-dim">
                      {b.entertainer_profiles?.stage_name} <span className="text-chalk-faint">at</span>{" "}
                      {b.venue_profiles?.venue_name}
                    </td>
                    <td className="px-4 py-3 text-chalk-dim">
                      {b.gigs?.date ? formatGigDate(b.gigs.date) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-chalk tabular-nums">
                      {formatPence(b.agreed_fee)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}
                      >
                        {status.label}
                      </span>
                      {b.cancellation_reason ? (
                        <p className="mt-1 max-w-xs text-xs text-chalk-faint">
                          {b.cancellation_reason}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
