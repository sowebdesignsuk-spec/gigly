import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ActAvatar } from "@/components/profile/act-avatar";
import { createClient } from "@/lib/supabase/server";
import { ENTERTAINER_CATEGORIES, formatPence } from "@/lib/profile/constants";
import { milesBetween } from "@/lib/utils/distance";
import { formatDistance, plural } from "@/lib/utils/format";
import { resolveLocation } from "@/lib/utils/postcode";

export const metadata: Metadata = {
  title: "Find entertainers",
  description:
    "Singers, bands, DJs, comedians, tribute acts and more, available to book across the UK. Browse profiles, hear the music, message them directly.",
};

type Search = Promise<{ category?: string; near?: string; radius?: string; q?: string }>;

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

/**
 * Public directory of acts.
 *
 * Individual profiles were already public; this is the index that makes them
 * findable — for a venue browsing before signing up, and for search engines.
 *
 * Filtering happens in TypeScript rather than SQL because it spans two tables
 * with no join key PostgREST can filter across in one round trip, and the set
 * is small. If this list ever outgrows a few hundred acts it wants the same
 * treatment as gigs: a SQL function with the spatial index doing the work.
 */
export default async function EntertainersPage({ searchParams }: { searchParams: Search }) {
  const { category, near, radius, q } = await searchParams;
  const supabase = await createClient();

  const { data: acts } = await supabase
    .from("entertainer_profiles")
    .select(
      "id, user_id, stage_name, bio, categories, starting_price, travel_radius_miles, average_rating, total_bookings, profile_completeness",
    )
    .order("profile_completeness", { ascending: false })
    .limit(200);

  const rows = acts ?? [];
  const userIds = rows.map((a) => a.user_id);

  const { data: people } = userIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, avatar_url, location_text, location_lat, location_lng")
        .in("id", userIds)
    : { data: [] };

  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  // Only acts with something to show. An empty placeholder profile in a public
  // directory makes the whole marketplace look empty.
  let visible = rows.filter((a) => a.stage_name && a.categories.length > 0);

  if (category) visible = visible.filter((a) => a.categories.includes(category));

  if (q) {
    const term = q.toLowerCase();
    visible = visible.filter(
      (a) =>
        a.stage_name.toLowerCase().includes(term) || (a.bio ?? "").toLowerCase().includes(term),
    );
  }

  let origin: { lat: number; lng: number } | null = null;
  let resolvedPlace: string | null = null;
  if (near) {
    const [match] = await resolveLocation(near);
    if (match) {
      origin = { lat: match.lat, lng: match.lng };
      resolvedPlace = match.text;
    }
  }

  const miles = radius ? Number(radius) : 50;

  const withDistance = visible.map((act) => {
    const person = personById.get(act.user_id);
    const distance =
      origin && person?.location_lat && person?.location_lng
        ? milesBetween(origin.lat, origin.lng, person.location_lat, person.location_lng)
        : null;
    return { act, person, distance };
  });

  const filtered = origin
    ? withDistance
        // An act's own travel radius counts: someone who will drive 60 miles is
        // available to a venue 60 miles away, even if they live further than
        // the venue's search radius.
        .filter(
          (r) =>
            r.distance != null &&
            (r.distance <= miles || r.distance <= r.act.travel_radius_miles),
        )
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    : withDistance;

  const inputClass =
    "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none";

  return (
    <div className="grain flex flex-1 flex-col">
      <SiteHeader />

      <div className="stage-wash">
        <div className="mx-auto w-full max-w-4xl px-6 pt-12 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Find entertainers</h1>
          <p className="mt-3 max-w-xl text-chalk-dim">
            Singers, bands, DJs, comedians and tribute acts available across the UK. Browse
            without an account — message them once you&apos;ve signed up.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
        <form method="get" role="search" className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="q" className="block text-xs font-medium text-chalk-dim">
              Search
            </label>
            <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Name or style" className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category" className="block text-xs font-medium text-chalk-dim">
              Type of act
            </label>
            <select id="category" name="category" defaultValue={category ?? ""} className={inputClass}>
              <option value="">Any</option>
              {ENTERTAINER_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="near" className="block text-xs font-medium text-chalk-dim">
              Near
            </label>
            <input id="near" name="near" defaultValue={near ?? ""} placeholder="Town or postcode" className={inputClass} />
          </div>

          <div className="flex gap-3 sm:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-hot-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-hot-400"
            >
              Search
            </button>
            <Link href="/entertainers" className="rounded-lg px-3 py-2.5 text-sm text-chalk-dim hover:text-chalk">
              Clear
            </Link>
          </div>
        </form>

        {filtered.length === 0 ? (
          <div className="panel lit-edge mt-8 p-10 text-center">
            <p className="text-lg font-semibold text-chalk">No acts match that</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-chalk-dim">
              Try a wider area or a different type of act.
            </p>
            <Link
              href="/entertainers"
              className="mt-6 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-hot-400"
            >
              Show everyone
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-8 text-sm font-medium text-chalk-faint">
              {plural(filtered.length, "act")}
              {resolvedPlace ? (
                <span className="font-normal"> · within {plural(miles, "mile")} of {resolvedPlace}</span>
              ) : null}
            </p>

            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {filtered.map(({ act, person, distance }) => {
                return (
                  <li key={act.id}>
                    <Link
                      href={`/entertainers/${act.id}`}
                      className="panel panel-interactive lit-edge flex h-full gap-4 p-5"
                    >
                      <ActAvatar name={act.stage_name} path={person?.avatar_url} size={64} />

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-semibold text-chalk">{act.stage_name}</h2>
                        <p className="mt-0.5 truncate text-xs text-chalk-dim">
                          {act.categories.map((c) => CATEGORY_LABEL.get(c) ?? c).join(" · ")}
                        </p>
                        <p className="mt-1 truncate text-xs text-chalk-faint">
                          {person?.location_text ?? "UK"}
                          {distance != null ? ` · ${formatDistance(distance)}` : ""}
                        </p>

                        {act.bio ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-chalk-dim">
                            {act.bio}
                          </p>
                        ) : null}

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 text-xs">
                          {act.starting_price ? (
                            <span className="font-semibold text-hot-400">
                              From {formatPence(act.starting_price)}
                            </span>
                          ) : null}
                          {act.average_rating ? (
                            <span className="text-chalk-faint">
                              {Number(act.average_rating).toFixed(1)} ★
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
