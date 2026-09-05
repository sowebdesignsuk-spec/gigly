import Link from "next/link";

import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";
import { daysUntil, formatFee, formatGigDate } from "@/lib/utils/format";

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

export type HeroGig = {
  id: string;
  title: string;
  category: string;
  date: string;
  location_text: string;
  budget_min: number;
  budget_max: number | null;
  is_urgent: boolean;
  venue_name: string;
};

/**
 * The hero's right-hand column: three real, live gigs.
 *
 * Real rows rather than a stock photograph or an invented mockup — it is the
 * most honest thing a marketplace can put on its front page, and it stops the
 * hero being a wall of text with nothing beside it. Renders nothing at all
 * when the database is empty, so a fresh install degrades to a one-column
 * hero instead of an empty frame.
 */
export function HeroGigs({ gigs }: { gigs: HeroGig[] }) {
  if (gigs.length === 0) return null;

  return (
    <div className="relative">
      {/* Glow behind the stack, so it reads as lit rather than pasted on. */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(24rem_18rem_at_60%_20%,color-mix(in_oklab,var(--color-hot-500)_18%,transparent),transparent_70%)]"
      />

      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-hot-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-hot-500" />
        </span>
        <p className="text-xs font-semibold tracking-widest text-chalk-faint uppercase">
          Open right now
        </p>
      </div>

      <ul className="space-y-2.5">
        {gigs.map((gig, i) => (
          <li key={gig.id} className="rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
            <Link
              href={`/gigs/${gig.id}`}
              className="panel panel-interactive lit-edge block overflow-hidden p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {gig.is_urgent ? (
                      <span className="rounded-full bg-hot-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-hot-400 uppercase">
                        Urgent
                      </span>
                    ) : null}
                    <span className="text-[11px] text-chalk-faint">
                      {CATEGORY_LABEL.get(gig.category) ?? gig.category}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-chalk">{gig.title}</p>
                  <p className="mt-0.5 truncate text-xs text-chalk-dim">
                    {gig.venue_name} · {gig.location_text}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-hot-400 tabular-nums">
                    {formatFee(gig.budget_min, gig.budget_max)}
                  </p>
                  <p className="text-[11px] text-chalk-faint">{formatGigDate(gig.date)}</p>
                </div>
              </div>

              <p className="mt-2 text-[11px] text-chalk-faint">{daysUntil(gig.date)}</p>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/gigs"
        className="mt-3 inline-block text-sm font-medium text-hot-500 transition-colors hover:text-hot-400"
      >
        See every open gig →
      </Link>
    </div>
  );
}
