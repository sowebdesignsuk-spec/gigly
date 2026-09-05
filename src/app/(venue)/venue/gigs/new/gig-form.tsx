"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";
import { saveGig, type GigState } from "../actions";

function Actions() {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="submit"
        name="intent"
        value="publish"
        disabled={pending}
        className="py-4 text-base sm:px-10"
      >
        {pending ? "Saving…" : "Publish gig"}
      </Button>
      <Button
        type="submit"
        name="intent"
        value="draft"
        variant="secondary"
        disabled={pending}
        className="py-4 text-base sm:px-8"
      >
        Save as draft
      </Button>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-xl border border-ink-700 bg-ink-800 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-chalk">{title}</h2>
        {description ? <p className="text-sm text-chalk-dim">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export type GigFormDefaults = {
  gigId?: string;
  title: string;
  category: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  budgetMinPounds: string;
  budgetMaxPounds: string;
  audienceSize: string;
  requirements: string;
  inclusions: string;
  isUrgent: boolean;
  postcode: string;
  venuePostcode: string;
};

export function GigForm({ defaults }: { defaults: GigFormDefaults }) {
  const [state, formAction] = useActionState<GigState, FormData>(saveGig, {});

  return (
    <form action={formAction} className="space-y-5">
      {defaults.gigId ? <input type="hidden" name="gig_id" value={defaults.gigId} /> : null}

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

      <Section title="The gig">
        <Field
          htmlFor="title"
          label="Title"
          hint="What an act sees in the list. Be specific."
        >
          <Input
            id="title"
            name="title"
            required
            minLength={4}
            defaultValue={defaults.title}
            placeholder="Saturday night covers band — 2 x 45 min sets"
          />
        </Field>

        <Field htmlFor="category" label="Type of act">
          <Select id="category" name="category" required defaultValue={defaults.category}>
            <option value="" disabled>
              Choose one…
            </option>
            {ENTERTAINER_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor="description"
          label="Description"
          hint="The night, the crowd, what you're after. This is what sells the gig."
        >
          <Textarea
            id="description"
            name="description"
            required
            minLength={20}
            defaultValue={defaults.description}
            placeholder="Busy Saturday crowd, mostly 30–50. Looking for a band who can fill the floor from 9pm…"
          />
        </Field>
      </Section>

      <Section title="When">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field htmlFor="date" label="Date">
            <Input id="date" name="date" type="date" required defaultValue={defaults.date} />
          </Field>

          <Field htmlFor="start_time" label="Start">
            <Input
              id="start_time"
              name="start_time"
              type="time"
              required
              defaultValue={defaults.startTime}
            />
          </Field>

          <Field htmlFor="end_time" label="End" hint="Optional.">
            <Input
              id="end_time"
              name="end_time"
              type="time"
              defaultValue={defaults.endTime}
            />
          </Field>
        </div>

        <label className="flex items-start gap-3 text-sm text-chalk-dim">
          <input
            type="checkbox"
            name="is_urgent"
            defaultChecked={defaults.isUrgent}
            className="mt-1 size-4 accent-hot-500"
          />
          <span>
            <span className="font-medium text-chalk">Mark as urgent</span>
            <span className="mt-0.5 block text-xs text-chalk-faint">
              For last-minute cover. Urgent gigs sort to the top.
            </span>
          </span>
        </label>
      </Section>

      <Section
        title="Where"
        description={`Defaults to your venue (${defaults.venuePostcode || "no postcode set"}). Change it only if the gig is somewhere else.`}
      >
        <Field htmlFor="postcode" label="Postcode">
          <Input
            id="postcode"
            name="postcode"
            defaultValue={defaults.postcode}
            placeholder={defaults.venuePostcode}
            className="uppercase"
          />
        </Field>
      </Section>

      <Section
        title="The fee"
        description="Exact fee, or a range. Never leave it blank — it's the single biggest thing that kills applications."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="budget_min" label="Fee" hint="In pounds.">
            <Input
              id="budget_min"
              name="budget_min"
              inputMode="decimal"
              required
              defaultValue={defaults.budgetMinPounds}
              placeholder="300"
            />
          </Field>

          <Field
            htmlFor="budget_max"
            label="Up to"
            hint="Leave blank for an exact fee."
          >
            <Input
              id="budget_max"
              name="budget_max"
              inputMode="decimal"
              defaultValue={defaults.budgetMaxPounds}
              placeholder="450"
            />
          </Field>
        </div>
      </Section>

      <Section title="The detail" description="Optional, but acts filter hard on this.">
        <Field htmlFor="audience_size" label="Expected audience">
          <Input
            id="audience_size"
            name="audience_size"
            defaultValue={defaults.audienceSize}
            placeholder="100–150"
          />
        </Field>

        <Field
          htmlFor="requirements"
          label="Requirements"
          hint="Genre, dress code, equipment the act needs to bring."
        >
          <Textarea
            id="requirements"
            name="requirements"
            defaultValue={defaults.requirements}
            placeholder="Own PA needed. No backing tracks. Smart casual."
          />
        </Field>

        <Field
          htmlFor="inclusions"
          label="What you provide"
          hint="PA, lighting, parking, meals, accommodation."
        >
          <Textarea
            id="inclusions"
            name="inclusions"
            defaultValue={defaults.inclusions}
            placeholder="Full PA and lights, parking behind the pub, meal and drinks on the night."
          />
        </Field>
      </Section>

      <Actions />
    </form>
  );
}
