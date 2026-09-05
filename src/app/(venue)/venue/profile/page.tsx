import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { CompletenessMeter } from "@/components/profile/completeness-meter";
import { createClient } from "@/lib/supabase/server";
import { venueCompleteness } from "@/lib/profile/completeness";
import { VenueProfileForm } from "./venue-form";

export const metadata: Metadata = { title: "Venue profile" };

/** Venue profile form — Section 5, Week 2.5–2.6 and 2.8. */
export default async function VenueProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: venue }] = await Promise.all([
    supabase.from("profiles").select("full_name, location_text").eq("id", user.id).single(),
    supabase.from("venue_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const completeness = venueCompleteness(
    { location_text: profile?.location_text ?? null },
    {
      venue_name: venue?.venue_name ?? "",
      venue_type: venue?.venue_type ?? null,
      address_line_1: venue?.address_line_1 ?? "",
      city: venue?.city ?? "",
      postcode: venue?.postcode ?? "",
      description: venue?.description ?? null,
      entertainment_preferences: venue?.entertainment_preferences ?? [],
      venue_photos: venue?.venue_photos ?? [],
      website_url: venue?.website_url ?? null,
    },
  );

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              {venue ? "Your venue" : "Set up your venue"}
            </h1>
            <p className="text-sm text-chalk-dim">
              {venue
                ? "Acts see this before they decide whether to apply."
                : "Fill this in once, and every gig you post inherits it."}
            </p>
          </div>

          {venue ? (
            <Link
              href={`/venues/${venue.id}`}
              className="shrink-0 rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-sm font-medium text-chalk transition-colors hover:border-hot-500"
            >
              View as an act sees it
            </Link>
          ) : null}
        </div>

        <div className="mt-8">
          <CompletenessMeter completeness={completeness} />
        </div>

        <div className="mt-6">
          <VenueProfileForm
            defaults={{
              userId: user.id,
              venueName: venue?.venue_name ?? "",
              venueType: venue?.venue_type ?? "",
              addressLine1: venue?.address_line_1 ?? "",
              addressLine2: venue?.address_line_2 ?? "",
              city: venue?.city ?? "",
              postcode: venue?.postcode ?? "",
              description: venue?.description ?? "",
              websiteUrl: venue?.website_url ?? "",
              preferences: venue?.entertainment_preferences ?? [],
              photos: venue?.venue_photos ?? [],
            }}
          />
        </div>
      </main>
    </>
  );
}
