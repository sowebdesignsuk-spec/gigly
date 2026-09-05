import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { GigCard, type GigCardData } from "@/components/gig/gig-card";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { formatPence } from "@/lib/profile/constants";
import { daysUntil, formatGigDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Home" };

/**
 * Entertainer home — Section 5, Week 7.5 and 7.6: next gig, this week's
 * availability, recommended gigs, recent activity.
 */
export default async function EntertainerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("mark_completed_bookings");

  const [{ data: profile }, { data: entertainer }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, onboarding_complete, location_lat, location_lng")
      .eq("id", user.id)
      .single(),
    supabase
      .from("entertainer_profiles")
      .select("id, categories, travel_radius_miles, profile_completeness")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: nextBookings }, { data: recommended }, { data: pendingApps }, { data: weekSlots }] =
    entertainer
      ? await Promise.all([
          supabase
            .from("bookings")
            .select("id, agreed_fee, gigs(title, date, start_time), venue_profiles(venue_name)")
            .eq("entertainer_id", entertainer.id)
            .eq("status", "confirmed"),
          // Week 7.5: matched on categories, within radius. Only meaningful once
          // the profile has a location.
          profile?.location_lat && profile.location_lng
            ? supabase.rpc("search_gigs", {
                p_lat: profile.location_lat,
                p_lng: profile.location_lng,
                p_radius_miles: entertainer.travel_radius_miles,
                p_categories: entertainer.categories.length ? entertainer.categories : undefined,
                p_limit: 5,
              })
            : Promise.resolve({ data: [] }),
          supabase
            .from("applications")
            .select("id, status, gigs(title, date)")
            .eq("entertainer_id", entertainer.id)
            .in("status", ["sent", "viewed", "shortlisted", "offered"])
            .order("updated_at", { ascending: false })
            .limit(5),
          supabase
            .from("availability")
            .select("date, status")
            .eq("entertainer_id", entertainer.id)
            .gte("date", today)
            .lte("date", weekEnd),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const next = (nextBookings ?? [])
    .filter((b) => b.gigs && b.gigs.date >= today)
    .sort((a, b) => a.gigs!.date.localeCompare(b.gigs!.date))[0];

  const offers = (pendingApps ?? []).filter((a) => a.status === "offered");
  const first = profile?.full_name?.split(" ")[0];

  const slots = weekSlots ?? [];
  const weekSummary = (() => {
    if (slots.length === 0) return "Nothing marked in your diary for the next seven days.";
    const booked = slots.filter((x) => x.status === "booked").length;
    const held = slots.filter((x) => x.status === "held").length;
    const off = slots.filter((x) => x.status === "unavailable").length;
    return [booked ? `${booked} booked` : null, held ? `${held} held` : null, off ? `${off} off` : null]
      .filter(Boolean)
      .join(" · ");
  })();

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold">Hi{first ? `, ${first}` : ""}</h1>

        {offers.length > 0 ? (
          <Link
            href="/entertainer/applications"
            className="mt-6 block rounded-xl border border-go/50 bg-go/10 p-5 hover:border-go"
          >
            <p className="font-semibold text-chalk">
              You have {offers.length} offer{offers.length === 1 ? "" : "s"} waiting
            </p>
            <p className="mt-1 text-sm text-chalk-dim">
              {offers.map((o) => o.gigs?.title).filter(Boolean).join(" · ")}
            </p>
          </Link>
        ) : null}

        {!entertainer || !profile?.onboarding_complete ? (
          <Link
            href="/entertainer/profile"
            className="mt-6 block rounded-xl border border-hot-500/40 bg-hot-500/10 p-5 hover:border-hot-500"
          >
            <p className="font-semibold text-chalk">Finish your profile</p>
            <p className="mt-1 text-sm text-chalk-dim">
              {entertainer
                ? `${entertainer.profile_completeness}% complete. Venues can't find you until there's a name, a category and a location.`
                : "Venues can't find you until it exists. Takes a few minutes."}
            </p>
          </Link>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-ink-700 bg-ink-800 p-5">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">Next gig</h2>
            {next?.gigs ? (
              <Link href={`/entertainer/bookings/${next.id}`} className="mt-3 block hover:text-hot-400">
                <p className="font-semibold text-chalk">{next.gigs.title}</p>
                <p className="mt-1 text-sm text-chalk-dim">
                  {next.venue_profiles?.venue_name} · {formatGigDate(next.gigs.date)}
                </p>
                <p className="mt-1 text-xs text-chalk-faint">
                  {daysUntil(next.gigs.date)} · {formatPence(next.agreed_fee)}
                </p>
              </Link>
            ) : (
              <p className="mt-3 text-sm text-chalk-dim">Nothing booked yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-ink-700 bg-ink-800 p-5">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">This week</h2>
            <p className="mt-3 text-sm text-chalk-dim">{weekSummary}</p>
            <Link href="/entertainer/diary" className="mt-3 inline-block text-sm text-hot-500 hover:text-hot-400">
              Open diary →
            </Link>
          </section>
        </div>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              Recommended for you
            </h2>
            <Link href="/gigs" className="text-sm text-hot-500 hover:text-hot-400">
              All gigs →
            </Link>
          </div>
          {(recommended ?? []).length > 0 ? (
            <ul className="mt-3 space-y-3">
              {(recommended as GigCardData[]).map((gig) => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-ink-700 bg-ink-800 p-5 text-sm text-chalk-dim">
              {profile?.location_lat
                ? "No open gigs match your act within your travel radius right now. Widen it on your profile, or browse everything."
                : "Add a location to your profile and gigs near you appear here."}
            </p>
          )}
        </section>

        {(pendingApps ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              Recent activity
            </h2>
            <ul className="mt-3 divide-y divide-ink-700 rounded-xl border border-ink-700 bg-ink-800">
              {(pendingApps ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="truncate text-chalk">{a.gigs?.title}</span>
                  <span className="shrink-0 text-xs text-chalk-faint capitalize">{a.status}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
