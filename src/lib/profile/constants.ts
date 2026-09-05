import type { VenueType } from "@/lib/types/database";

/**
 * Section 4.2 defines categories and event_types as text[] rather than enums,
 * so the database will accept anything. These lists are the only thing keeping
 * the filters in Week 3 meaningful — "Singer" and "singer" are two different
 * facets to a GIN index.
 *
 * Adding a value here is safe. Renaming one strands every profile already using
 * the old value, so migrate the data in the same change.
 */

export const ENTERTAINER_CATEGORIES = [
  { value: "singer", label: "Singer" },
  { value: "band", label: "Band" },
  { value: "dj", label: "DJ" },
  { value: "comedian", label: "Comedian" },
  { value: "tribute", label: "Tribute act" },
  { value: "drag", label: "Drag" },
  { value: "dancer", label: "Dancer" },
  { value: "acoustic", label: "Acoustic" },
  { value: "other", label: "Other" },
] as const;

export const EVENT_TYPES = [
  { value: "pub", label: "Pubs" },
  { value: "club", label: "Clubs" },
  { value: "hotel", label: "Hotels" },
  { value: "festival", label: "Festivals" },
  { value: "wedding", label: "Weddings" },
  { value: "corporate", label: "Corporate" },
  { value: "private", label: "Private parties" },
  { value: "holiday_park", label: "Holiday parks" },
] as const;

export const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: "pub", label: "Pub" },
  { value: "club", label: "Club" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "holiday_park", label: "Holiday park" },
  { value: "event_company", label: "Event company" },
  { value: "festival", label: "Festival" },
  { value: "other", label: "Other" },
];

/** Media platforms accepted in entertainer_profiles.media_links. */
export const MEDIA_PLATFORMS = [
  { value: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { value: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/…" },
  { value: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/you" },
  { value: "instagram", label: "Instagram", placeholder: "https://instagram.com/you" },
] as const;

export type MediaPlatform = (typeof MEDIA_PLATFORMS)[number]["value"];

export type MediaLink = { type: MediaPlatform; url: string };

const VALID_CATEGORIES = new Set(ENTERTAINER_CATEGORIES.map((c) => c.value as string));
const VALID_EVENT_TYPES = new Set(EVENT_TYPES.map((e) => e.value as string));

export function keepValidCategories(values: string[]): string[] {
  return values.filter((v) => VALID_CATEGORIES.has(v));
}

export function keepValidEventTypes(values: string[]): string[] {
  return values.filter((v) => VALID_EVENT_TYPES.has(v));
}

/** Pence → "£250" or "£1,250.50". Fees are whole pounds far more often than not. */
export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pounds % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pounds);
}

/** "250", "£250", "250.50" → pence. Returns null for anything unparseable. */
export function parsePoundsToPence(input: string): number | null {
  const clean = input.replace(/[£,\s]/g, "");
  if (!clean) return null;

  const pounds = Number(clean);
  if (!Number.isFinite(pounds) || pounds < 0) return null;

  return Math.round(pounds * 100);
}
