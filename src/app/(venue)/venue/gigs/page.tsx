import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";
import { formatFee, formatGigDate, formatTimeRange } from "@/lib/utils/format";
import { setGigVisibility } from "./actions";

export const metadata: Metadata = { title: "My gigs" };

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

const VISIBILITY_STYLE: Record<string, string> = {
  published: "bg-go/15 text-go",
  draft: "bg-ink-700 text-chalk-dim",
  closed: "bg-ink-700 text-chalk-dim",
  cancelled: "bg-stop/15 text-stop",
};

type Search = Promise<{ saved?: string }>;

/** Venue's own listings — Section 5, Week 3.2 and 4.3. */
export default async function VenueGigsPage({ searchParams }: { searchParams: Search }) {
  const { saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: venue }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("venue_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  // RLS already limits this to the venue's own gigs, drafts included.
  const { data: gigs } = venue
    ? await supabase
        .from("gigs")
        .select("*")
        .eq("venue_id", venue.id)
        .order("date", { ascending: true })
    : { data: [] };

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">My gigs</h1>
            <p className="text-sm text-chalk-dim">Everything you&apos;ve posted, drafts included.</p>
          </div>
          <Link
            href="/venue/gigs/new"
            className="rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
          >
            Post a gig
          </Link>
        </div>

        {saved ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-go/40 bg-go/10 px-4 py-3 text-sm text-go"
          >
            {saved === "published" ? "Gig published — acts can apply now." : "Draft saved."}
          </p>
        ) : null}

        {!gigs || gigs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">Nothing posted yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Your first listing takes about two minutes. Acts can apply the moment
              it&apos;s live.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {gigs.map((gig) => (
              <li key={gig.id} className="rounded-xl border border-ink-700 bg-ink-800 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${VISIBILITY_STYLE[gig.visibility] ?? ""}`}
                      >
                        {gig.visibility}
                      </span>
                      <span className="text-xs text-chalk-faint">
                        {CATEGORY_LABEL.get(gig.category) ?? gig.category}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-chalk">{gig.title}</h2>
                    <p className="text-sm text-chalk-dim">
                      {formatGigDate(gig.date)} ·{" "}
                      {formatTimeRange(gig.start_time, gig.end_time)} ·{" "}
                      {formatFee(gig.budget_min, gig.budget_max)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-chalk">{gig.application_count}</p>
                    <p className="text-xs text-chalk-faint">
                      applicant{gig.application_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/venue/gigs/${gig.id}/applications`}
                    className="rounded-lg bg-ink-700 px-4 py-2 text-xs font-semibold text-chalk hover:bg-ink-600"
                  >
                    {gig.application_count > 0 ? "Review applicants" : "Applicants"}
                  </Link>

                  <Link
                    href={`/gigs/${gig.id}`}
                    className="rounded-lg px-3 py-2 text-xs text-chalk-dim hover:text-chalk"
                  >
                    View listing
                  </Link>

                  {gig.visibility === "draft" ? (
                    <form action={setGigVisibility}>
                      <input type="hidden" name="gig_id" value={gig.id} />
                      <input type="hidden" name="visibility" value="published" />
                      <Button type="submit" className="px-4 py-2 text-xs">
                        Publish
                      </Button>
                    </form>
                  ) : null}

                  {gig.visibility === "published" ? (
                    <form action={setGigVisibility}>
                      <input type="hidden" name="gig_id" value={gig.id} />
                      <input type="hidden" name="visibility" value="closed" />
                      <Button type="submit" variant="ghost" className="px-3 py-2 text-xs">
                        Close listing
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
