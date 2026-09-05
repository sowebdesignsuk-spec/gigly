"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Textarea } from "@/components/ui/field";
import { submitReview, type ReviewState } from "@/lib/bookings/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="px-6 py-3 text-sm">
      {pending ? "Posting…" : "Post review"}
    </Button>
  );
}

/** Section 5, Week 8.1 — rate the other party after a completed booking. */
export function ReviewForm({ bookingId, whom }: { bookingId: string; whom: string }) {
  const [state, formAction] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);

  if (state.success) {
    return <FormMessage tone="success">{state.success}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-ink-700 bg-ink-800 p-5">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="space-y-1">
        <h2 className="font-semibold text-chalk">How was {whom}?</h2>
        <p className="text-xs text-chalk-dim">
          Reviews are public and can&apos;t be edited, so say what you&apos;d say to their face.
        </p>
      </div>

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            className={`text-2xl transition-colors ${n <= rating ? "text-hold" : "text-ink-600 hover:text-chalk-faint"}`}
          >
            ★
          </button>
        ))}
      </div>

      <Field htmlFor="body" label="Anything to add?" hint="Optional. Up to 500 characters.">
        <Textarea id="body" name="body" maxLength={500} className="min-h-24" />
      </Field>

      <Submit />
    </form>
  );
}
