import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { respondToOffer, withdrawApplication } from "@/lib/applications/actions";
import { formatPence } from "@/lib/profile/constants";
import { formatFee, formatGigDate, formatTimeRange } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My applications" };

const STATUS_COPY: Record<string, { label: string; style: string; note: string }> = {
  sent: {
    label: "Sent",
    style: "bg-ink-700 text-chalk-dim",
    note: "The venue hasn't opened it yet.",
  },
  viewed: {
    label: "Seen",
    style: "bg-ink-700 text-chalk-dim",
    note: "The venue has read your application.",
  },
  shortlisted: {
    label: "Shortlisted",
    style: "bg-hold/15 text-hold",
    note: "You're in the running. Nothing to do yet.",
  },
  offered: {
    label: "Offer",
    style: "bg-go/15 text-go",
    note: "The venue wants you. Accept to confirm.",
  },
  accepted: {
    label: "Confirmed",
    style: "bg-go/15 text-go",
    note: "You're playing this one.",
  },
  declined: {
    label: "Not this time",
    style: "bg-ink-700 text-chalk-faint",
    note: "The venue went another way.",
  },
  withdrawn: {
    label: "Withdrawn",
    style: "bg-ink-700 text-chalk-faint",
    note: "You pulled out of this one.",
  },
};

const ORDER: Record<string, number> = {
  offered: 0,
  accepted: 1,
  shortlisted: 2,
  viewed: 3,
  sent: 4,
  declined: 5,
  withdrawn: 6,
};

/** Entertainer's applications — Section 5, Week 4.5 and 4.8. */
export default async function MyApplicationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: entertainer }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("entertainer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const { data: applications } = entertainer
    ? await supabase
        .from("applications")
        .select(
          "id, status, proposed_fee, created_at, gigs(id, title, date, start_time, end_time, location_text, budget_min, budget_max, visibility, venue_profiles(venue_name))",
        )
        .eq("entertainer_id", entertainer.id)
    : { data: [] };

  const rows = [...(applications ?? [])].sort(
    (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9),
  );

  const offers = rows.filter((a) => a.status === "offered").length;

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My applications</h1>
          <p className="text-sm text-chalk-dim">
            {offers > 0
              ? `You have ${offers} offer${offers === 1 ? "" : "s"} waiting.`
              : "Everything you've applied for, and where it's at."}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">Nothing yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Gigs near you are waiting. Applying takes about a minute.
            </p>
            <Link
              href="/gigs"
              className="mt-4 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
            >
              Find gigs
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((application) => {
              const gig = application.gigs;
              if (!gig) return null;

              const status = STATUS_COPY[application.status] ?? STATUS_COPY.sent;
              const canWithdraw = ["sent", "viewed", "shortlisted"].includes(application.status);

              return (
                <li
                  key={application.id}
                  className={`rounded-xl border bg-ink-800 p-5 ${
                    application.status === "offered" ? "border-go/50" : "border-ink-700"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}
                      >
                        {status.label}
                      </span>
                      <Link
                        href={`/gigs/${gig.id}`}
                        className="block text-base font-semibold text-chalk hover:text-hot-400"
                      >
                        {gig.title}
                      </Link>
                      <p className="text-sm text-chalk-dim">
                        {gig.venue_profiles?.venue_name} · {formatGigDate(gig.date)} ·{" "}
                        {formatTimeRange(gig.start_time, gig.end_time)}
                      </p>
                      <p className="text-xs text-chalk-faint">{status.note}</p>
                    </div>

                    <div className="text-right text-sm">
                      <p className="font-semibold text-chalk">
                        {application.proposed_fee
                          ? formatPence(application.proposed_fee)
                          : formatFee(gig.budget_min, gig.budget_max)}
                      </p>
                      <p className="text-xs text-chalk-faint">
                        {application.proposed_fee ? "your quote" : "advertised"}
                      </p>
                    </div>
                  </div>

                  {application.status === "offered" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={respondToOffer}>
                        <input type="hidden" name="application_id" value={application.id} />
                        <input type="hidden" name="response" value="accept" />
                        <Button type="submit" className="px-5 py-2.5 text-sm">
                          Accept the gig
                        </Button>
                      </form>
                      <form action={respondToOffer}>
                        <input type="hidden" name="application_id" value={application.id} />
                        <input type="hidden" name="response" value="decline" />
                        <Button type="submit" variant="ghost" className="px-4 py-2.5 text-sm">
                          Turn it down
                        </Button>
                      </form>
                    </div>
                  ) : canWithdraw ? (
                    <form action={withdrawApplication} className="mt-4">
                      <input type="hidden" name="application_id" value={application.id} />
                      <Button type="submit" variant="ghost" className="px-3 py-2 text-xs">
                        Withdraw application
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
