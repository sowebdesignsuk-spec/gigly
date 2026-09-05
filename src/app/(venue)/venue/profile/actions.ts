"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { venueCompleteness } from "@/lib/profile/completeness";
import { VENUE_TYPES } from "@/lib/profile/constants";
import { lookupPostcode } from "@/lib/utils/postcode";
import type { VenueType } from "@/lib/types/database";

export type ProfileState = { error?: string; success?: string };

const VALID_VENUE_TYPES = new Set<string>(VENUE_TYPES.map((v) => v.value));

/** Loose UK postcode check. The geocoder is the real validator. */
const UK_POSTCODE = /^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i;

/** Section 5, Week 2.5–2.6 — create or update a venue profile. */
export async function saveVenueProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You're not signed in." };

  const venueName = String(formData.get("venue_name") ?? "").trim();
  if (venueName.length < 2) return { error: "Enter the venue's name." };

  const venueType = String(formData.get("venue_type") ?? "");
  if (!VALID_VENUE_TYPES.has(venueType)) return { error: "Pick a venue type." };

  const addressLine1 = String(formData.get("address_line_1") ?? "").trim();
  if (!addressLine1) return { error: "Enter the street address." };

  const city = String(formData.get("city") ?? "").trim();
  if (!city) return { error: "Enter the town or city." };

  const postcode = String(formData.get("postcode") ?? "").trim().toUpperCase();
  if (!UK_POSTCODE.test(postcode)) {
    return { error: "That doesn't look like a UK postcode." };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (description.length > 1000) return { error: "Keep the description under 1000 characters." };

  let websiteUrl = String(formData.get("website_url") ?? "").trim();
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    // People type "thedogandduck.co.uk". Rejecting that would be pedantic.
    websiteUrl = `https://${websiteUrl}`;
  }

  const preferences = formData.getAll("entertainment_preferences").map(String);
  const photos = String(formData.get("venue_photos") ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);

  // Geocoded from the postcode the venue already typed, rather than asking them
  // to pick their own town from a second autocomplete. A venue has a fixed
  // address; an entertainer does not, which is why the two forms differ.
  const geocoded = await lookupPostcode(postcode);
  if (!geocoded) {
    return { error: `We couldn't find ${postcode}. Check it and try again.` };
  }

  const locationText = geocoded.text;
  const locationLat = geocoded.lat;
  const locationLng = geocoded.lng;

  const venueRow = {
    user_id: user.id,
    venue_name: venueName,
    venue_type: venueType as VenueType,
    address_line_1: addressLine1,
    address_line_2: String(formData.get("address_line_2") ?? "").trim() || null,
    city,
    postcode,
    description: description || null,
    entertainment_preferences: preferences,
    website_url: websiteUrl || null,
    venue_photos: photos,
  };

  const { error: venueError } = await supabase
    .from("venue_profiles")
    .upsert(venueRow, { onConflict: "user_id" });

  if (venueError) return { error: venueError.message };

  const completeness = venueCompleteness({ location_text: locationText }, venueRow);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      location_text: locationText,
      location_lat: locationLat,
      location_lng: locationLng,
      // A venue is usable once it has a name, an address and a postcode —
      // everything needed to post a gig somebody can turn up to.
      onboarding_complete: completeness.score >= 60,
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath("/venue/dashboard");
  revalidatePath("/venue/profile");

  return { success: "Venue profile saved." };
}
