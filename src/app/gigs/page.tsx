import Link from "next/link";
import type { Metadata } from "next";

import { GigCard, type GigCardData } from "@/components/gig/gig-card";
import { GigFilters, type GigFilterValues } from "@/components/gig/gig-filters";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { ENTERTAINER_CATEGORIES, parsePoundsToPence } from "@/lib/profile/constants";
import { resolveLocation } from "@/lib/utils/postcode";

export const metadata: Metadata = {
  title: "Find gigs",
  description:
    "Live entertainment work across the UK — pubs, clubs, hotels, holiday parks and festivals booking singers, bands, DJs and more.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

/**
 * Public gig browse — Section 5, Week 3.3–3.5, 3.7.
 *
 * Public so listings are indexable (Section 2.2).
 *
 * Personalisation applies only on a *clean* visit — no search parameters at
 * all. The moment someone submits the filter form, the URL is taken literally.
 * Doing otherwise means the form says "Category: Any" while the query quietly
 * narrows to the act's own categories, and an empty result looks like a broken
 * search rather than a filter the user never chose.
 */
export default async function GigsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const supabase = await createClient();

  const userSearched = Object.keys(params).length > 0;

  const filters: GigFilterValues = {
    q: one(params.q),
    category: one(params.category),
    from: one(params.from),
    to: one(params.to),
    near: one(params.near),
    radius: one(params.radius),
    min: one(params.min),
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let matchedCategories: string[] | null = null;
  let personalised = false;
  let lat: number | null = null;
  let lng: number | null = null;

  if (user && !userSearched) {
    const [{ data: profile }, { data: entertainer }] = await Promise.all([
      supabase
        .from("profiles")
        .select("account_type, location_lat, location_lng, location_text")
        .eq("id", user.id)
        .single(),
      supabase
        .from("entertainer_profiles")
        .select("categories, travel_radius_miles")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profile?.account_type === "entertainer" && profile.location_lat && profile.location_lng) {
      lat = profile.location_lat;
      lng = profile.location_lng;
      personalised = true;
      matchedCategories = entertainer?.categories?.length ? entertainer.categories : null;

      filters.near = profile.location_text ?? undefined;
      filters.radius = String(entertainer?.travel_radius_miles ?? 30);
    }
  }

  // On an explicit search, coordinates come only from what was typed.
  if (userSearched && filters.near) {
    const [match] = await resolveLocation(filters.near);
    if (match) {
      lat = match.lat;
      lng = match.lng;
    }
  }

  const radiusNumber = filters.radius ? Number(filters.radius) : null;
  const radius =
    radiusNumber && Number.isFinite(radiusNumber) ? Math.round(radiusNumber) : undefined;

  const { data: gigs, error } = await supabase.rpc("search_gigs", {
    p_lat: lat ?? undefined,
    p_lng: lng ?? undefined,
    // A radius is meaningless without a point to measure from.
    p_radius_miles: lat != null && lng != null ? radius : undefined,
    p_categories: filters.category ? [filters.category] : (matchedCategories ?? undefined),
    p_date_from: filters.from,
    p_date_to: filters.to,
    p_budget_min: filters.min ? (parsePoundsToPence(filters.min) ?? undefined) : undefined,
    p_query: filters.q,
    p_limit: 48,
    p_offset: 0,
  });

  const results = (gigs ?? []) as GigCardData[];

  // What is actually narrowing the results, in the user's words. Shown above
  // the list so an empty page always explains itself.
  const activeFilters = [
    filters.q ? `“${filters.q}”` : null,
    filters.category ? (CATEGORY_LABEL.get(filters.category) ?? filters.category) : null,
    lat != null && filters.near ? `within ${radius ?? 30} miles of ${filters.near}` : null,
    filters.min ? `paying ${filters.min.startsWith("£") ? filters.min : `£${filters.min}`}+` : null,
    filters.from ? `from ${filters.from}` : null,
    filters.to ? `until ${filters.to}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grain flex flex-1 flex-col">
      <SiteHeader />

      <div className="stage-wash">
        <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Find gigs</h1>
          <p className="mt-3 text-chalk-dim">
            Live entertainment work across the UK. Browse without an account.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        {personalised ? (
          <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-chalk-dim">
              Matched to your act
              {matchedCategories?.length
                ? ` (${matchedCategories.map((c) => CATEGORY_LABEL.get(c) ?? c).join(", ")})`
                : ""}
              , within {filters.radius} miles of {filters.near}.
            </p>
            <Link
              href="/gigs?all=1"
              className="shrink-0 text-sm font-semibold text-hot-500 hover:text-hot-400"
            >
              Show everything →
            </Link>
          </div>
        ) : null}

        <GigFilters values={filters} />

        {error ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-stop/40 bg-stop/10 p-5 text-sm text-stop"
          >
            Search isn&apos;t responding right now. Try again in a moment.
          </p>
        ) : results.length === 0 ? (
          <div className="panel lit-edge mt-8 p-10 text-center">
            <p className="text-lg font-semibold text-chalk">No gigs match that</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-chalk-dim">
              {activeFilters.length > 0
                ? `Nothing open ${activeFilters.join(", ")}. Try widening the radius or dropping a filter.`
                : "There are no gigs open at the moment. Check back soon."}
            </p>
            {activeFilters.length > 0 ? (
              <Link
                href="/gigs?all=1"
                className="mt-6 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-hot-400"
              >
                Show all gigs
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mt-8 text-sm font-medium text-chalk-faint">
              {results.length} gig{results.length === 1 ? "" : "s"}
              {activeFilters.length > 0 ? (
                <span className="font-normal"> · {activeFilters.join(" · ")}</span>
              ) : null}
            </p>
            <ul className="mt-3 space-y-3">
              {results.map((gig) => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </ul>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
