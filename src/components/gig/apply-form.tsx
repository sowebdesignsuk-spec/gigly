"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";
import { applyToGig, type ApplyState } from "@/lib/applications/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-4 text-base sm:w-auto sm:px-10">
      {pending ? "Sending…" : "Apply for this gig"}
    </Button>
  );
}

/** Section 5, Week 4.1 — the apply form itself. */
export function ApplyForm({ gigId }: { gigId: string }) {
  const [state, formAction] = useActionState<ApplyState, FormData>(applyToGig, {});

  if (state.success) {
    return <FormMessage tone="success">{state.success}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-ink-700 bg-ink-800 p-6">
      <input type="hidden" name="gig_id" value={gigId} />

      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-chalk">Apply for this gig</h2>
        <p className="text-sm text-chalk-dim">
          The venue sees your profile automatically. Everything below is optional.
        </p>
      </div>

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

      <Field
        htmlFor="proposed_fee"
        label="Your fee"
        hint="In pounds. Leave blank to accept the advertised fee."
      >
        <Input id="proposed_fee" name="proposed_fee" inputMode="decimal" placeholder="350" />
      </Field>

      <Field
        htmlFor="message"
        label="Message"
        hint="A line or two on why you fit this particular night beats a generic pitch."
      >
        <Textarea
          id="message"
          name="message"
          placeholder="We play this kind of room every weekend and can bring our own PA…"
        />
      </Field>

      <Submit />
    </form>
  );
}
