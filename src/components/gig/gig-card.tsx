import Link from "next/link";

import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";
import {
  daysUntil,
  formatDistance,
  formatFee,
  formatGigDate,
  formatTimeRange,
} from "@/lib/utils/format";

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

export type GigCardData = {
  id: string;
  title: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string | null;
  location_text: string;
  budget_min: number;
  budget_max: number | null;
  is_urgent: boolean;
  is_featured: boolean;
  application_count: number;
  venue_name: string;
  distance_miles?: number | null;
};

/** Gig card for listing views — Section 5, Week 3.5. */
export function GigCard({ gig }: { gig: GigCardData }) {
  const distance = formatDistance(gig.distance_miles);

  return (
    <li>
      <Link
        href={`/gigs/${gig.id}`}
        className="block rounded-xl border border-ink-700 bg-ink-800 p-5 transition-colors hover:border-hot-500"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {gig.is_urgent ? (
                <span className="rounded-full bg-hot-500/15 px-2.5 py-0.5 text-xs font-semibold text-hot-400">
                  Urgent
                </span>
              ) : null}
              {gig.is_featured ? (
                <span className="rounded-full bg-hold/15 px-2.5 py-0.5 text-xs font-semibold text-hold">
                  Featured
                </span>
              ) : null}
              <span className="text-xs text-chalk-faint">
                {CATEGORY_LABEL.get(gig.category) ?? gig.category}
              </span>
            </div>

            <h3 className="text-base font-semibold text-chalk">{gig.title}</h3>
            <p className="text-sm text-chalk-dim">{gig.venue_name}</p>
          </div>

          <div className="text-right">
            <p className="font-semibold text-chalk">
              {formatFee(gig.budget_min, gig.budget_max)}
            </p>
            <p className="text-xs text-chalk-faint">{daysUntil(gig.date)}</p>
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-chalk-dim">
          <div>
            <dt className="sr-only">Date</dt>
            <dd>{formatGigDate(gig.date)}</dd>
          </div>
          <div>
            <dt className="sr-only">Time</dt>
            <dd>{formatTimeRange(gig.start_time, gig.end_time)}</dd>
          </div>
          <div>
            <dt className="sr-only">Location</dt>
            <dd>
              {gig.location_text}
              {distance ? ` · ${distance}` : ""}
            </dd>
          </div>
          {gig.application_count > 0 ? (
            <div>
              <dt className="sr-only">Applications</dt>
              <dd>
                {gig.application_count} applicant
                {gig.application_count === 1 ? "" : "s"}
              </dd>
            </div>
          ) : null}
        </dl>
      </Link>
    </li>
  );
}
