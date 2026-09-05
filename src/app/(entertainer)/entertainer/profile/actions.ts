"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { entertainerCompleteness } from "@/lib/profile/completeness";
import {
  MEDIA_PLATFORMS,
  keepValidCategories,
  keepValidEventTypes,
  parsePoundsToPence,
  type MediaLink,
} from "@/lib/profile/constants";

export type ProfileState = { error?: string; success?: string };

const VALID_PLATFORMS = new Set<string>(MEDIA_PLATFORMS.map((p) => p.value));

/** Drops anything that isn't a known platform with an http(s) URL. */
function parseMediaLinks(raw: string): MediaLink[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry): MediaLink[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { type, url } = entry as Record<string, unknown>;

      if (typeof type !== "string" || typeof url !== "string") return [];
      if (!VALID_PLATFORMS.has(type)) return [];
      if (!/^https?:\/\//i.test(url)) return [];

      return [{ type: type as MediaLink["type"], url }];
    });
  } catch {
    return [];
  }
}

function parseCoordinate(raw: FormDataEntryValue | null): number | null {
  const value = Number(String(raw ?? ""));
  return Number.isFinite(value) && value !== 0 ? value : null;
}

/** Section 5, Week 2.1–2.4 — create or update an entertainer profile. */
export async function saveEntertainerProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You're not signed in." };

  const stageName = String(formData.get("stage_name") ?? "").trim();
  if (stageName.length < 2) {
    return { error: "Enter a stage name — it's the first thing venues see." };
  }

  const bio = String(formData.get("bio") ?? "").trim();
  if (bio.length > 1000) {
    return { error: "Keep the bio under 1000 characters." };
  }

  const categories = keepValidCategories(formData.getAll("categories").map(String));
  if (categories.length === 0) {
    return { error: "Pick at least one thing you do." };
  }

  const eventTypes = keepValidEventTypes(formData.getAll("event_types").map(String));
  const mediaLinks = parseMediaLinks(String(formData.get("media_links") ?? ""));

  const startingPrice = parsePoundsToPence(String(formData.get("starting_price") ?? ""));
  const rawRadius = Number(formData.get("travel_radius_miles"));
  const travelRadius =
    Number.isFinite(rawRadius) && rawRadius >= 0 && rawRadius <= 500 ? Math.round(rawRadius) : 30;

  const locationText = String(formData.get("location_text") ?? "").trim() || null;
  const locationLat = parseCoordinate(formData.get("location_lat"));
  const locationLng = parseCoordinate(formData.get("location_lng"));
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim() || null;

  const entertainerRow = {
    user_id: user.id,
    stage_name: stageName,
    bio: bio || null,
    categories,
    event_types: eventTypes,
    starting_price: startingPrice,
    travel_radius_miles: travelRadius,
    media_links: mediaLinks,
  };

  // Completeness is derived from the values about to be written, not from a
  // re-read afterwards — one round trip, and no window where the stored score
  // describes the previous version of the profile.
  const completeness = entertainerCompleteness(
    { avatar_url: avatarUrl, location_text: locationText },
    entertainerRow,
  );

  const { error: entertainerError } = await supabase
    .from("entertainer_profiles")
    .upsert(
      { ...entertainerRow, profile_completeness: completeness.score },
      { onConflict: "user_id" },
    );

  if (entertainerError) {
    return { error: entertainerError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      location_text: locationText,
      location_lat: locationLat,
      location_lng: locationLng,
      // The bar for "onboarded" is the three things a venue needs to find you
      // at all: a name, a category, and a location.
      onboarding_complete: Boolean(stageName && categories.length > 0 && locationText),
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/entertainer/dashboard");
  revalidatePath("/entertainer/profile");

  return { success: "Profile saved." };
}
