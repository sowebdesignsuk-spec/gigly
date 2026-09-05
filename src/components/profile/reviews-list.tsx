import { createClient } from "@/lib/supabase/server";

/**
 * Reviews received by one user, for public profiles — Section 5, Week 8.2.
 *
 * Reads only visible reviews (the RLS policy enforces that for anonymous
 * callers anyway) and names the reviewer through public_profiles, so a
 * reviewer's email never travels with their review.
 */
export async function loadReviews(userId: string) {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, reviewer_id, bookings(gigs(title, date))")
    .eq("reviewed_user_id", userId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = reviews ?? [];
  const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id))];

  const { data: people } = reviewerIds.length
    ? await supabase.from("public_profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] };

  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  const average =
    rows.length > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : null;

  return {
    average,
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      reviewer: nameOf.get(r.reviewer_id) ?? "A GIGLY user",
      gig: r.bookings?.gigs?.title ?? null,
      date: r.bookings?.gigs?.date ?? null,
    })),
  };
}

export type Reviews = Awaited<ReturnType<typeof loadReviews>>;

export function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-hold">
      {"★".repeat(Math.round(rating))}
      <span className="text-ink-600">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export function ReviewsList({ reviews, of }: { reviews: Reviews; of: string }) {
  if (reviews.count === 0) return null;

  return (
    <section className="mt-10 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
          Reviews
        </h2>
        <p className="text-sm text-chalk-dim">
          <Stars rating={reviews.average ?? 0} />{" "}
          <span className="font-semibold text-chalk">{reviews.average?.toFixed(1)}</span> ·{" "}
          {reviews.count} review{reviews.count === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="space-y-3">
        {reviews.items.map((r) => (
          <li key={r.id} className="rounded-xl border border-ink-700 bg-ink-800 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm">
                <Stars rating={r.rating} />
                <span className="ml-2 font-medium text-chalk">{r.reviewer}</span>
              </p>
              <p className="text-xs text-chalk-faint">
                {r.gig ? `${r.gig} · ` : ""}
                {new Date(r.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
              </p>
            </div>
            {r.body ? (
              <p className="mt-3 text-sm leading-relaxed text-chalk-dim">{r.body}</p>
            ) : (
              <p className="mt-3 text-xs text-chalk-faint">Rated {of}, no comment left.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
