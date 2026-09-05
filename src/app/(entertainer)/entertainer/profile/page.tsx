import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { CompletenessMeter } from "@/components/profile/completeness-meter";
import { createClient } from "@/lib/supabase/server";
import { entertainerCompleteness } from "@/lib/profile/completeness";
import { loadSettings } from "@/lib/settings/load";
import type { MediaLink } from "@/lib/profile/constants";
import { EntertainerProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

/** media_links is jsonb, so it arrives as Json and has to be narrowed. */
function asMediaLinks(value: unknown): MediaLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): MediaLink[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const { type, url } = entry as Record<string, unknown>;
    return typeof type === "string" && typeof url === "string"
      ? [{ type: type as MediaLink["type"], url }]
      : [];
  });
}

/** Entertainer profile wizard and editor — Section 5, Week 2.1–2.4 and 2.8. */
export default async function EntertainerProfilePage() {
  const [supabase, settings] = await Promise.all([createClient(), loadSettings()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const defaultRadius = Number(settings.get("marketplace.default_radius_miles")) || 30;

  const [{ data: profile }, { data: entertainer }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, location_text, location_lat, location_lng")
      .eq("id", user.id)
      .single(),
    supabase
      .from("entertainer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const mediaLinks = asMediaLinks(entertainer?.media_links);

  // Scored from what is stored right now, so the meter reflects the saved
  // profile rather than whatever is currently typed into the form.
  const completeness = entertainerCompleteness(
    {
      avatar_url: profile?.avatar_url ?? null,
      location_text: profile?.location_text ?? null,
    },
    {
      stage_name: entertainer?.stage_name ?? "",
      bio: entertainer?.bio ?? null,
      categories: entertainer?.categories ?? [],
      starting_price: entertainer?.starting_price ?? null,
      travel_radius_miles: entertainer?.travel_radius_miles ?? 0,
      media_links: mediaLinks,
      event_types: entertainer?.event_types ?? [],
    },
  );

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              {entertainer ? "Your profile" : "Set up your profile"}
            </h1>
            <p className="text-sm text-chalk-dim">
              {entertainer
                ? "Keep it current — venues judge fast."
                : "A few minutes now, and venues can start finding you."}
            </p>
          </div>

          {entertainer ? (
            <Link
              href={`/entertainers/${entertainer.id}`}
              className="shrink-0 rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-sm font-medium text-chalk transition-colors hover:border-hot-500"
            >
              View as a venue sees it
            </Link>
          ) : null}
        </div>

        <div className="mt-8">
          <CompletenessMeter completeness={completeness} />
        </div>

        <div className="mt-6">
          <EntertainerProfileForm
            defaults={{
              userId: user.id,
              avatarPath: profile?.avatar_url ?? null,
              locationText: profile?.location_text ?? null,
              locationLat: profile?.location_lat ?? null,
              locationLng: profile?.location_lng ?? null,
              stageName: entertainer?.stage_name ?? "",
              bio: entertainer?.bio ?? "",
              categories: entertainer?.categories ?? [],
              eventTypes: entertainer?.event_types ?? [],
              startingPricePounds: entertainer?.starting_price
                ? String(entertainer.starting_price / 100)
                : "",
              travelRadiusMiles: entertainer?.travel_radius_miles ?? defaultRadius,
              mediaLinks,
            }}
          />
        </div>
      </main>
    </>
  );
}
