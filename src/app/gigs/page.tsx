import Link from "next/link";
import type { Metadata } from "next";

import { GigCard, type GigCardData } from "@/components/gig/gig-card";
import { GigFilters, type GigFilterValues } from "@/components/gig/gig-filters";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { parsePoundsToPence } from "@/lib/profile/constants";
import { resolveLocation } from "@/lib/utils/postcode";

export const metadata: Metadata = {
  title: "Find gigs",
  description:
    "Live entertainment work across the UK — pubs, clubs, hotels, holiday parks and festivals booking singers, bands, DJs and more.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

/**
 * Public gig browse — Section 5, Week 3.3–3.5, 3.7.
 *
 * Public so listings are indexable (Section 2.2). Signed-in entertainers get
 * their own location and travel radius applied by default, which is the
 * "matching" of Week 3.8: the first thing they see is already relevant.
 */
export default async function GigsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const supabase = await createClient();

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

  // Defaults from the signed-in entertainer's own profile, used only where the
  // URL doesn't already say otherwise.
  let defaultLat: number | null = null;
  let defaultLng: number | null = null;
  let defaultRadius: number | null = null;
  let defaultCategories: string[] | null = null;
  let personalised = false;

  if (user) {
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
      defaultLat = profile.location_lat;
      defaultLng = profile.location_lng;
      defaultRadius = entertainer?.travel_radius_miles ?? 30;
      defaultCategories = entertainer?.categories?.length ? entertainer.categories : null;
      personalised = true;

      if (!filters.near) filters.near = profile.location_text ?? undefined;
      if (!filters.radius) filters.radius = String(defaultRadius);
    }
  }

  // A typed location overrides the profile default.
  let lat = defaultLat;
  let lng = defaultLng;

  if (filters.near) {
    const [match] = await resolveLocation(filters.near);
    if (match) {
      lat = match.lat;
      lng = match.lng;
    }
  }

  const radius = filters.radius ? Number(filters.radius) : defaultRadius;
  const categories = filters.category
    ? [filters.category]
    : // Only narrow to the act's own categories when they haven't searched or
      // filtered themselves — otherwise a deliberate search returns nothing and
      // looks broken.
      !filters.q && personalised
      ? defaultCategories
      : null;

  // The generated RPC types express "not supplied" as undefined, not null.
  const { data: gigs, error } = await supabase.rpc("search_gigs", {
    p_lat: lat ?? undefined,
    p_lng: lng ?? undefined,
    p_radius_miles:
      radius && Number.isFinite(radius) ? Math.round(radius) : undefined,
    p_categories: categories ?? undefined,
    p_date_from: filters.from,
    p_date_to: filters.to,
    p_budget_min: filters.min ? (parsePoundsToPence(filters.min) ?? undefined) : undefined,
    p_query: filters.q,
    p_limit: 48,
    p_offset: 0,
  });

  const results = (gigs ?? []) as GigCardData[];

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Find gigs</h1>
          <p className="text-sm text-chalk-dim">
            {personalised && !filters.q
              ? "Filtered to what you do, within your travel radius. Change anything below."
              : "Live entertainment work across the UK."}
          </p>
        </div>

        <div className="mt-6">
          <GigFilters values={filters} />
        </div>

        {error ? (
          <p role="alert" className="mt-8 rounded-xl border border-stop/40 bg-stop/10 p-5 text-sm text-stop">
            Search isn&apos;t responding right now. Try again in a moment.
          </p>
        ) : results.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">No gigs match that</p>
            <p className="mt-1 text-sm text-chalk-dim">
              {personalised
                ? "Try widening your travel radius, or clearing the filters to see everything."
                : "Try a wider radius or fewer filters."}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-8 text-sm text-chalk-faint">
              {results.length} gig{results.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 space-y-3">
              {results.map((gig) => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
