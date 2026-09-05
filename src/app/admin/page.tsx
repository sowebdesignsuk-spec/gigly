import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { loadDemoData, removeDemoData } from "./actions";

export const metadata: Metadata = { title: "Admin" };

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800 p-5">
      <p className="text-3xl font-bold text-chalk tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-chalk">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-chalk-faint">{sub}</p> : null}
    </div>
  );
}

/** Admin overview — Section 5, Week 9.3 "basic analytics view". */
export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [{ data, error }, { count: demoCount }] = await Promise.all([
    supabase.rpc("admin_stats").maybeSingle(),
    supabase
      .from("profile_private")
      .select("user_id", { count: "exact", head: true })
      .like("email", "%@demo.gigly.invalid"),
  ]);
  const demoLoaded = (demoCount ?? 0) > 0;

  if (error || !data) {
    return (
      <p role="alert" className="rounded-xl border border-stop/40 bg-stop/10 p-5 text-sm text-stop">
        Couldn&apos;t load stats{error ? `: ${error.message}` : ""}.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-sm text-chalk-dim">The marketplace right now.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">People</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Users" value={data.users_total} sub={`${data.users_new_7d} new this week`} />
          <Stat label="Entertainers" value={data.users_entertainers} />
          <Stat label="Venues" value={data.users_venues} />
          <Stat label="Suspended" value={data.users_suspended} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">Supply</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Gigs posted" value={data.gigs_total} sub={`${data.gigs_new_7d} this week`} />
          <Stat label="Open right now" value={data.gigs_published} sub="published, upcoming" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
          Demand
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Applications"
            value={data.applications_total}
            sub={`${data.applications_new_7d} this week`}
          />
          <Stat label="Offers waiting" value={data.offers_open} sub="sent, not yet answered" />
          <Stat label="Bookings" value={data.bookings_total} />
          <Stat label="Hidden reviews" value={data.reviews_hidden} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
          Demo data
        </h2>
        <div className="rounded-xl border border-ink-700 bg-ink-800 p-5">
          <p className="text-sm text-chalk">
            {demoLoaded
              ? `Loaded — ${demoCount} demo accounts. Sign in as any of them with the password `
              : "Five venues, eight acts, ten gigs, applications in every status, a booking, reviews and a message thread. All accounts share the password "}
            <code className="rounded bg-ink-900 px-1.5 py-0.5 text-xs">gigly-demo</code>
            {demoLoaded ? "." : ". Removable in one click."}
          </p>
          {demoLoaded ? (
            <p className="mt-2 text-xs text-chalk-faint">
              Try <code>dogandduck@demo.gigly.invalid</code> (venue) and{" "}
              <code>neon@demo.gigly.invalid</code> (band) — they have a live thread and a
              shortlisted application between them.
            </p>
          ) : null}
          <div className="mt-4">
            {demoLoaded ? (
              <form action={removeDemoData}>
                <Button type="submit" variant="secondary" className="px-4 py-2 text-xs text-stop">
                  Remove demo data
                </Button>
              </form>
            ) : (
              <form action={loadDemoData}>
                <Button type="submit" className="px-4 py-2 text-xs">
                  Load demo data
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-chalk-faint">
        Liquidity check: the plan wants 15–25 entertainers and 8–12 venues before
        launch. A marketplace with one side is a directory.
      </p>
    </div>
  );
}
