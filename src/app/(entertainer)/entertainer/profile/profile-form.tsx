"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ChipGroup } from "@/components/profile/chip-group";
import { LocationInput } from "@/components/profile/location-input";
import { MediaLinksInput } from "@/components/profile/media-links-input";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";
import {
  ENTERTAINER_CATEGORIES,
  EVENT_TYPES,
  type MediaLink,
} from "@/lib/profile/constants";
import { saveEntertainerProfile, type ProfileState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-4 text-base sm:w-auto sm:px-10">
      {pending ? "Saving…" : "Save profile"}
    </Button>
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

export type EntertainerFormDefaults = {
  userId: string;
  avatarPath: string | null;
  locationText: string | null;
  locationLat: number | null;
  locationLng: number | null;
  stageName: string;
  bio: string;
  categories: string[];
  eventTypes: string[];
  startingPricePounds: string;
  travelRadiusMiles: number;
  mediaLinks: MediaLink[];
};

export function EntertainerProfileForm({ defaults }: { defaults: EntertainerFormDefaults }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    saveEntertainerProfile,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      {state.success ? <FormMessage tone="success">{state.success}</FormMessage> : null}

      <Section title="The basics" description="What a venue sees first.">
        <AvatarUpload userId={defaults.userId} defaultPath={defaults.avatarPath} />

        <Field
          htmlFor="stage_name"
          label="Stage name"
          hint="The name you perform under, not your legal name."
        >
          <Input
            id="stage_name"
            name="stage_name"
            required
            minLength={2}
            defaultValue={defaults.stageName}
            placeholder="e.g. The Reyt Good Band"
          />
        </Field>

        <Field
          htmlFor="location"
          label="Where you're based"
          hint="Used to work out which gigs are within your travel radius."
        >
          <LocationInput
            defaultText={defaults.locationText ?? ""}
            defaultLat={defaults.locationLat}
            defaultLng={defaults.locationLng}
          />
        </Field>
      </Section>

      <Section
        title="What you do"
        description="Pick everything that applies — these are the filters venues search with."
      >
        <ChipGroup
          name="categories"
          options={ENTERTAINER_CATEGORIES}
          defaultValue={defaults.categories}
        />
      </Section>

      <Section title="Your bio" description="A short paragraph on what your set is actually like.">
        <Field htmlFor="bio" label="Bio" hint="Up to 1000 characters.">
          <Textarea
            id="bio"
            name="bio"
            maxLength={1000}
            defaultValue={defaults.bio}
            placeholder="Two hours of floor-filling covers from the 70s to now, full PA and lights included…"
          />
        </Field>
      </Section>

      <Section title="Money and travel">
        <Field
          htmlFor="starting_price"
          label="Starting price"
          hint="Your minimum fee, in pounds. Venues filter by budget — leaving this blank filters you out."
        >
          <Input
            id="starting_price"
            name="starting_price"
            inputMode="decimal"
            defaultValue={defaults.startingPricePounds}
            placeholder="250"
          />
        </Field>

        <Field
          htmlFor="travel_radius_miles"
          label="Travel radius"
          hint="How far you'll travel for a gig, in miles."
        >
          <Input
            id="travel_radius_miles"
            name="travel_radius_miles"
            type="number"
            min={0}
            max={500}
            defaultValue={defaults.travelRadiusMiles}
          />
        </Field>
      </Section>

      <Section
        title="Event types"
        description="The kinds of booking you actually want. Leave the ones you'd turn down."
      >
        <ChipGroup name="event_types" options={EVENT_TYPES} defaultValue={defaults.eventTypes} />
      </Section>

      <Section
        title="Video and music"
        description="Nothing sells a live act like seeing one. Paste links to anything public."
      >
        <MediaLinksInput defaultValue={defaults.mediaLinks} />
      </Section>

      <Submit />
    </form>
  );
}
