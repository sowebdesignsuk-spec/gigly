import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { setReviewVisibility } from "../actions";

export const metadata: Metadata = { title: "Reviews · Admin" };

/**
 * Review moderation — Section 5, Week 8.3 and 9.1.
 *
 * Review submission (Week 8.1) isn't built yet, so this will be empty until it
 * is. The table, RLS and rating trigger already exist, so the moderation side
 * is complete now rather than retrofitted later.
 */
export default async function AdminReviewsPage() {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, is_visible, created_at, reviewer_id, reviewed_user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = reviews ?? [];
  const ids = [...new Set(rows.flatMap((r) => [r.reviewer_id, r.reviewed_user_id]))];

  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };

  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-sm text-chalk-dim">
          Hide anything abusive. Hidden reviews drop out of the average immediately.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-chalk-faint">
          No reviews yet. They arrive once bookings are completed (Week 8).
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border bg-ink-800 p-5 ${r.is_visible ? "border-ink-700" : "border-stop/40 opacity-70"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-chalk">
                    <span className="font-semibold">{nameOf.get(r.reviewer_id) ?? "Someone"}</span>
                    <span className="text-chalk-dim"> reviewed </span>
                    <span className="font-semibold">{nameOf.get(r.reviewed_user_id) ?? "someone"}</span>
                  </p>
                  <p className="text-xs text-chalk-faint">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
                    {!r.is_visible ? " · hidden" : ""}
                  </p>
                </div>

                <form action={setReviewVisibility}>
                  <input type="hidden" name="review_id" value={r.id} />
                  <input type="hidden" name="visible" value={r.is_visible ? "false" : "true"} />
                  <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                    {r.is_visible ? "Hide" : "Show"}
                  </Button>
                </form>
              </div>

              {r.body ? (
                <blockquote className="mt-3 border-l-2 border-ink-600 pl-4 text-sm text-chalk-dim">
                  {r.body}
                </blockquote>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
