import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { formatPence } from "@/lib/profile/constants";
import { daysUntil, formatGigDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Home" };

/**
 * Venue home — Section 5, Week 7.7: next event, open listings, recent
 * applications, quick post action.
 */
export default async function VenueDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("mark_completed_bookings");

  const [{ data: profile }, { data: venue }] = await Promise.all([
    supabase.from("profiles").select("full_name, onboarding_complete").eq("id", user.id).single(),
    supabase.from("venue_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: bookings }, { data: openGigs }, { data: recentApps }] = venue
    ? await Promise.all([
        supabase
          .from("bookings")
          .select("id, agreed_fee, gigs(title, date), entertainer_profiles(stage_name)")
          .eq("venue_id", venue.id)
          .eq("status", "confirmed"),
        supabase
          .from("gigs")
          .select("id, title, date, application_count, is_urgent")
          .eq("venue_id", venue.id)
          .eq("visibility", "published")
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(6),
        supabase
          .from("applications")
          .select(
            "id, status, created_at, proposed_fee, gigs!inner(id, title, venue_id), entertainer_profiles(stage_name)",
          )
          .eq("gigs.venue_id", venue.id)
          .in("status", ["sent", "viewed", "shortlisted"])
          .order("created_at", { ascending: false })
          .limit(6),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const next = (bookings ?? [])
    .filter((b) => b.gigs && b.gigs.date >= today)
    .sort((a, b) => a.gigs!.date.localeCompare(b.gigs!.date))[0];

  const newApps = (recentApps ?? []).filter((a) => a.status === "sent").length;
  const first = profile?.full_name?.split(" ")[0];

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold">Hi{first ? `, ${first}` : ""}</h1>
          <Link
            href="/venue/gigs/new"
            className="rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
          >
            Post a gig
          </Link>
        </div>

        {!venue || !profile?.onboarding_complete ? (
          <Link
            href="/venue/profile"
            className="mt-6 block rounded-xl border border-hot-500/40 bg-hot-500/10 p-5 hover:border-hot-500"
          >
            <p className="font-semibold text-chalk">Finish your venue profile</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Every gig you post inherits it, and acts judge the gig by the venue behind it.
            </p>
          </Link>
        ) : null}

        {newApps > 0 ? (
          <Link
            href="/venue/gigs"
            className="mt-6 block rounded-xl border border-go/50 bg-go/10 p-5 hover:border-go"
          >
            <p className="font-semibold text-chalk">
              {newApps} new application{newApps === 1 ? "" : "s"} to look at
            </p>
          </Link>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-ink-700 bg-ink-800 p-5">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">Next event</h2>
            {next?.gigs ? (
              <Link href={`/venue/bookings/${next.id}`} className="mt-3 block hover:text-hot-400">
                <p className="font-semibold text-chalk">{next.gigs.title}</p>
                <p className="mt-1 text-sm text-chalk-dim">
                  {next.entertainer_profiles?.stage_name} · {formatGigDate(next.gigs.date)}
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
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              Open listings
            </h2>
            {(openGigs ?? []).length > 0 ? (
              <ul className="mt-3 space-y-2">
                {(openGigs ?? []).map((g) => (
                  <li key={g.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link
                      href={`/venue/gigs/${g.id}/applications`}
                      className="truncate text-chalk hover:text-hot-400"
                    >
                      {g.is_urgent ? <span className="mr-1 text-hot-400">●</span> : null}
                      {g.title}
                    </Link>
                    <span className="shrink-0 text-xs text-chalk-faint tabular-nums">
                      {g.application_count} app{g.application_count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-chalk-dim">Nothing live right now.</p>
            )}
            <Link href="/venue/gigs" className="mt-3 inline-block text-sm text-hot-500 hover:text-hot-400">
              All gigs →
            </Link>
          </section>
        </div>

        {(recentApps ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              Recent applications
            </h2>
            <ul className="mt-3 divide-y divide-ink-700 rounded-xl border border-ink-700 bg-ink-800">
              {(recentApps ?? []).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/venue/gigs/${a.gigs.id}/applications`}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-ink-700"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-chalk">
                        {a.entertainer_profiles?.stage_name}
                      </span>
                      <span className="block truncate text-xs text-chalk-faint">{a.gigs.title}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-chalk-dim">
                        {a.proposed_fee ? formatPence(a.proposed_fee) : "advertised"}
                      </span>
                      <span className="block text-xs text-chalk-faint capitalize">{a.status}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
