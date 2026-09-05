import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, publicImageUrl } from "@/lib/supabase/storage";
import { markApplicationsViewed, setApplicationStatus } from "@/lib/applications/actions";
import { ENTERTAINER_CATEGORIES, formatPence } from "@/lib/profile/constants";
import { milesBetween } from "@/lib/utils/distance";
import { formatDistance, formatFee, formatGigDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Applications" };

type Params = { params: Promise<{ id: string }> };

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-hot-500/15 text-hot-400",
  viewed: "bg-ink-700 text-chalk-dim",
  shortlisted: "bg-hold/15 text-hold",
  offered: "bg-go/15 text-go",
  accepted: "bg-go/15 text-go",
  declined: "bg-ink-700 text-chalk-faint",
  withdrawn: "bg-ink-700 text-chalk-faint",
};

const STATUS_ORDER: Record<string, number> = {
  accepted: 0,
  offered: 1,
  shortlisted: 2,
  sent: 3,
  viewed: 4,
  declined: 5,
  withdrawn: 6,
};

/** Venue's applicant list for one gig — Section 5, Week 4.3, 4.4, 4.7. */
export default async function GigApplicationsPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // RLS: a gig belonging to another venue comes back null, so this doubles as
  // the ownership check.
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title, date, location_lat, location_lng, budget_min, budget_max, visibility")
    .eq("id", id)
    .maybeSingle();

  if (!gig) notFound();

  // Opening the page is what "viewed" means — Section 4.5 viewed_at.
  await markApplicationsViewed(gig.id);

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, message, proposed_fee, created_at, entertainer_profiles(id, user_id, stage_name, categories, starting_price, average_rating, total_bookings)",
    )
    .eq("gig_id", gig.id)
    .order("created_at", { ascending: true });

  const rows = applications ?? [];

  const userIds = rows
    .map((a) => a.entertainer_profiles?.user_id)
    .filter((v): v is string => Boolean(v));

  const { data: people } = userIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, avatar_url, location_text, location_lat, location_lng")
        .in("id", userIds)
    : { data: [] };

  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  const sorted = [...rows].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  );

  const hasAccepted = rows.some((a) => a.status === "accepted");

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/venue/gigs" className="text-sm text-chalk-dim hover:text-chalk">
          ← My gigs
        </Link>

        <div className="mt-4 space-y-2">
          <h1 className="text-3xl font-bold">{gig.title}</h1>
          <p className="text-sm text-chalk-dim">
            {formatGigDate(gig.date)} · {formatFee(gig.budget_min, gig.budget_max)} ·{" "}
            {rows.length} applicant{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        {hasAccepted ? (
          <p className="mt-6 rounded-xl border border-go/40 bg-go/10 px-4 py-3 text-sm text-go">
            This gig is booked. Bookings and the calendar land in Week 5.
          </p>
        ) : null}

        {sorted.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">No applications yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              {gig.visibility === "published"
                ? "Acts within range will see this in their feed. Give it a day or two."
                : "This listing isn't published, so nobody can see it."}
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {sorted.map((application) => {
              const act = application.entertainer_profiles;
              if (!act) return null;

              const person = personById.get(act.user_id);
              const avatar = publicImageUrl(AVATARS_BUCKET, person?.avatar_url);
              const distance =
                gig.location_lat && gig.location_lng && person?.location_lat && person?.location_lng
                  ? milesBetween(gig.location_lat, gig.location_lng, person.location_lat, person.location_lng)
                  : null;

              const isOpen = !["accepted", "declined", "withdrawn"].includes(application.status);

              return (
                <li
                  key={application.id}
                  className="rounded-xl border border-ink-700 bg-ink-800 p-5"
                >
                  <div className="flex gap-4">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-900">
                      {avatar ? (
                        <Image src={avatar} alt="" fill sizes="56px" className="object-cover" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[application.status] ?? ""}`}
                        >
                          {application.status}
                        </span>
                        {distance != null ? (
                          <span className="text-xs text-chalk-faint">
                            {formatDistance(distance)}
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href={`/entertainers/${act.id}`}
                        className="block text-base font-semibold text-chalk hover:text-hot-400"
                      >
                        {act.stage_name}
                      </Link>

                      <p className="text-xs text-chalk-dim">
                        {act.categories.map((c) => CATEGORY_LABEL.get(c) ?? c).join(" · ")}
                        {person?.location_text ? ` — ${person.location_text}` : ""}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalk-dim">
                        <span>
                          Quoted:{" "}
                          <span className="font-semibold text-chalk">
                            {application.proposed_fee
                              ? formatPence(application.proposed_fee)
                              : "advertised fee"}
                          </span>
                        </span>
                        {act.starting_price ? (
                          <span>Usually from {formatPence(act.starting_price)}</span>
                        ) : null}
                        {act.average_rating ? (
                          <span>
                            {Number(act.average_rating).toFixed(1)} ★ · {act.total_bookings}{" "}
                            bookings
                          </span>
                        ) : (
                          <span>No ratings yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {application.message ? (
                    <blockquote className="mt-4 border-l-2 border-ink-600 pl-4 text-sm leading-relaxed text-chalk-dim">
                      {application.message}
                    </blockquote>
                  ) : null}

                  {isOpen && !hasAccepted ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {application.status !== "offered" ? (
                        <form action={setApplicationStatus}>
                          <input type="hidden" name="application_id" value={application.id} />
                          <input type="hidden" name="status" value="offered" />
                          <Button type="submit" className="px-4 py-2 text-xs">
                            Make offer
                          </Button>
                        </form>
                      ) : (
                        <span className="self-center text-xs text-chalk-dim">
                          Offer sent — waiting on the act.
                        </span>
                      )}

                      {application.status !== "shortlisted" && application.status !== "offered" ? (
                        <form action={setApplicationStatus}>
                          <input type="hidden" name="application_id" value={application.id} />
                          <input type="hidden" name="status" value="shortlisted" />
                          <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
                            Shortlist
                          </Button>
                        </form>
                      ) : null}

                      <form action={setApplicationStatus}>
                        <input type="hidden" name="application_id" value={application.id} />
                        <input type="hidden" name="status" value="declined" />
                        <Button type="submit" variant="ghost" className="px-3 py-2 text-xs">
                          Decline
                        </Button>
                      </form>
                    </div>
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
