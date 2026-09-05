import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatFee, formatGigDate } from "@/lib/utils/format";
import { moderateGig } from "../actions";

export const metadata: Metadata = { title: "Gigs · Admin" };

const VISIBILITY_STYLE: Record<string, string> = {
  published: "bg-go/15 text-go",
  draft: "bg-ink-700 text-chalk-dim",
  closed: "bg-ink-700 text-chalk-dim",
  cancelled: "bg-stop/15 text-stop",
};

/** Gig moderation — Section 5, Week 9.1. Admin RLS shows every gig, drafts included. */
export default async function AdminGigsPage() {
  const supabase = await createClient();

  const { data: gigs } = await supabase
    .from("gigs")
    .select(
      "id, title, category, date, visibility, budget_min, budget_max, application_count, created_at, venue_profiles(venue_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Gigs</h1>
        <p className="text-sm text-chalk-dim">
          Every listing, including drafts. Cancel anything that shouldn&apos;t be up.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-700">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-ink-800 text-left text-xs tracking-wide text-chalk-faint uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Gig</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Fee</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Apps</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {(gigs ?? []).map((g) => (
              <tr key={g.id} className="align-top">
                <td className="px-4 py-3">
                  <Link href={`/gigs/${g.id}`} className="font-medium text-chalk hover:text-hot-400">
                    {g.title}
                  </Link>
                  <p className="text-xs text-chalk-dim">
                    {g.venue_profiles?.venue_name} · {g.category}
                  </p>
                </td>
                <td className="px-4 py-3 text-chalk-dim">{formatGigDate(g.date)}</td>
                <td className="px-4 py-3 text-chalk-dim">{formatFee(g.budget_min, g.budget_max)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${VISIBILITY_STYLE[g.visibility] ?? ""}`}
                  >
                    {g.visibility}
                  </span>
                </td>
                <td className="px-4 py-3 text-chalk-dim tabular-nums">{g.application_count}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {g.visibility === "published" ? (
                      <form action={moderateGig}>
                        <input type="hidden" name="gig_id" value={g.id} />
                        <input type="hidden" name="visibility" value="cancelled" />
                        <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs text-stop">
                          Take down
                        </Button>
                      </form>
                    ) : g.visibility === "cancelled" ? (
                      <form action={moderateGig}>
                        <input type="hidden" name="gig_id" value={g.id} />
                        <input type="hidden" name="visibility" value="published" />
                        <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                          Restore
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-chalk-faint">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(gigs ?? []).length === 0 ? (
        <p className="text-sm text-chalk-faint">No gigs have been posted yet.</p>
      ) : null}
    </div>
  );
}
