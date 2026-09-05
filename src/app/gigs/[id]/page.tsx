import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ApplyPanel } from "@/components/gig/apply-panel";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";
import {
  formatFee,
  formatGigDateLong,
  formatTimeRange,
} from "@/lib/utils/format";

type Params = { params: Promise<{ id: string }> };

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

async function loadGig(id: string) {
  const supabase = await createClient();

  // RLS keeps drafts belonging to other venues out of this, so a guessed id
  // returns nothing rather than an unpublished listing.
  const { data: gig } = await supabase.from("gigs").select("*").eq("id", id).maybeSingle();
  if (!gig) return null;

  const { data: venue } = await supabase
    .from("venue_profiles")
    .select("id, venue_name, venue_type, city, description, website_url, total_gigs_posted")
    .eq("id", gig.venue_id)
    .maybeSingle();

  return venue ? { gig, venue } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const data = await loadGig(id);

  if (!data) return { title: "Gig not found" };

  const { gig, venue } = data;
  const description = `${formatGigDateLong(gig.date)} at ${venue.venue_name}, ${gig.location_text}. ${formatFee(gig.budget_min, gig.budget_max)}.`;

  return {
    title: gig.title,
    description,
    openGraph: { title: `${gig.title} · GIGLY`, description, type: "article" },
  };
}

/** Public gig detail — Section 5, Week 3.6. */
export default async function GigDetailPage({ params }: Params) {
  const { id } = await params;
  const data = await loadGig(id);

  if (!data) notFound();

  const { gig, venue } = data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center gap-2">
          {gig.is_urgent ? (
            <span className="rounded-full bg-hot-500/15 px-2.5 py-0.5 text-xs font-semibold text-hot-400">
              Urgent
            </span>
          ) : null}
          <span className="text-xs text-chalk-faint">
            {CATEGORY_LABEL.get(gig.category) ?? gig.category}
          </span>
          {gig.visibility !== "published" ? (
            <span className="rounded-full bg-ink-700 px-2.5 py-0.5 text-xs font-semibold text-chalk-dim">
              {gig.visibility}
            </span>
          ) : null}
        </div>

        <h1 className="mt-3 text-3xl font-bold">{gig.title}</h1>

        <p className="mt-2 text-sm text-chalk-dim">
          <Link href={`/venues/${venue.id}`} className="text-hot-500 hover:text-hot-400">
            {venue.venue_name}
          </Link>{" "}
          · {gig.location_text}
        </p>

        <dl className="mt-8 grid gap-4 rounded-xl border border-ink-700 bg-ink-800 p-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs tracking-wide text-chalk-faint uppercase">Date</dt>
            <dd className="mt-1 text-sm font-medium text-chalk">{formatGigDateLong(gig.date)}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-chalk-faint uppercase">Time</dt>
            <dd className="mt-1 text-sm font-medium text-chalk">
              {formatTimeRange(gig.start_time, gig.end_time)}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-chalk-faint uppercase">Fee</dt>
            <dd className="mt-1 text-sm font-medium text-chalk">
              {formatFee(gig.budget_min, gig.budget_max)}
            </dd>
          </div>
        </dl>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
            About this gig
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-chalk-dim">
            {gig.description}
          </p>
        </section>

        {gig.audience_size ? (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              Expected audience
            </h2>
            <p className="text-sm text-chalk-dim">{gig.audience_size}</p>
          </section>
        ) : null}

        {gig.requirements ? (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              Requirements
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-chalk-dim">
              {gig.requirements}
            </p>
          </section>
        ) : null}

        {gig.inclusions ? (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              What the venue provides
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-chalk-dim">
              {gig.inclusions}
            </p>
          </section>
        ) : null}

        {venue.description ? (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              About {venue.venue_name}
            </h2>
            <p className="text-sm leading-relaxed text-chalk-dim">{venue.description}</p>
          </section>
        ) : null}

        <div className="mt-10">
          <ApplyPanel gigId={gig.id} isSignedIn={Boolean(user)} />
        </div>
      </div>
    </main>
  );
}
