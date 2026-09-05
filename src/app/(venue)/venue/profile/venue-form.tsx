"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ChipGroup } from "@/components/profile/chip-group";
import { PhotoGalleryUpload } from "@/components/profile/photo-gallery-upload";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { ENTERTAINER_CATEGORIES, VENUE_TYPES } from "@/lib/profile/constants";
import { saveVenueProfile, type ProfileState } from "./actions";

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

export type VenueFormDefaults = {
  userId: string;
  venueName: string;
  venueType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  description: string;
  websiteUrl: string;
  preferences: string[];
  photos: string[];
};

export function VenueProfileForm({ defaults }: { defaults: VenueFormDefaults }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(saveVenueProfile, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      {state.success ? <FormMessage tone="success">{state.success}</FormMessage> : null}

      <Section title="The venue">
        <Field htmlFor="venue_name" label="Venue name">
          <Input
            id="venue_name"
            name="venue_name"
            required
            minLength={2}
            defaultValue={defaults.venueName}
            placeholder="The Dog and Duck"
          />
        </Field>

        <Field htmlFor="venue_type" label="Venue type">
          <Select id="venue_type" name="venue_type" required defaultValue={defaults.venueType}>
            <option value="" disabled>
              Choose one…
            </option>
            {VENUE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="website_url" label="Website" hint="Optional.">
          <Input
            id="website_url"
            name="website_url"
            defaultValue={defaults.websiteUrl}
            placeholder="thedogandduck.co.uk"
          />
        </Field>
      </Section>

      <Section
        title="Address"
        description="We work out travel distance from your postcode, so it needs to be right."
      >
        <Field htmlFor="address_line_1" label="Street address">
          <Input
            id="address_line_1"
            name="address_line_1"
            required
            autoComplete="address-line1"
            defaultValue={defaults.addressLine1}
          />
        </Field>

        <Field htmlFor="address_line_2" label="Address line 2" hint="Optional.">
          <Input
            id="address_line_2"
            name="address_line_2"
            autoComplete="address-line2"
            defaultValue={defaults.addressLine2}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="city" label="Town or city">
            <Input
              id="city"
              name="city"
              required
              autoComplete="address-level2"
              defaultValue={defaults.city}
            />
          </Field>

          <Field htmlFor="postcode" label="Postcode">
            <Input
              id="postcode"
              name="postcode"
              required
              autoComplete="postal-code"
              defaultValue={defaults.postcode}
              placeholder="M1 1AE"
              className="uppercase"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="About the venue"
        description="Room size, the crowd, what a typical night looks like. Acts use this to decide if they fit."
      >
        <Field htmlFor="description" label="Description" hint="Up to 1000 characters.">
          <Textarea
            id="description"
            name="description"
            maxLength={1000}
            defaultValue={defaults.description}
            placeholder="Corner pub with a proper stage, capacity 120, live music every Friday and Saturday. PA and lights provided…"
          />
        </Field>
      </Section>

      <Section
        title="Acts you usually book"
        description="Puts your gigs in front of the right people."
      >
        <ChipGroup
          name="entertainment_preferences"
          options={ENTERTAINER_CATEGORIES}
          defaultValue={defaults.preferences}
        />
      </Section>

      <Section title="Photos" description="Acts want to see the stage before they apply.">
        <PhotoGalleryUpload userId={defaults.userId} defaultPaths={defaults.photos} />
      </Section>

      <Submit />
    </form>
  );
}
