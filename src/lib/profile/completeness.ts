import type { EntertainerProfile, Profile, VenueProfile } from "@/lib/types/database";

/**
 * Profile completeness — Section 5, Week 2.4.
 *
 * The checklist lives here rather than in a database function so that the score
 * and the "what's missing" prompts come from one definition. Two definitions
 * would eventually disagree, and a profile reading 80% with nothing listed as
 * missing is worse than no score at all.
 *
 * entertainer_profiles.profile_completeness caches the number for sorting and
 * display; it is written on save, not read as truth.
 */

export type CompletenessItem = {
  key: string;
  label: string;
  /** What this unlocks, shown to the user. Vague nagging gets ignored. */
  why: string;
  done: boolean;
  /** Relative importance. The score is weighted, not a flat count. */
  weight: number;
};

export type Completeness = {
  score: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
};

function score(items: CompletenessItem[]): Completeness {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);

  return {
    score: total === 0 ? 0 : Math.round((earned / total) * 100),
    items,
    missing: items.filter((item) => !item.done),
  };
}

function hasText(value: string | null | undefined, min = 1): boolean {
  return typeof value === "string" && value.trim().length >= min;
}

export function entertainerCompleteness(
  profile: Pick<Profile, "avatar_url" | "location_text">,
  entertainer: Pick<
    EntertainerProfile,
    "stage_name" | "bio" | "categories" | "starting_price" | "travel_radius_miles" | "media_links" | "event_types"
  >,
): Completeness {
  const media = Array.isArray(entertainer.media_links) ? entertainer.media_links : [];

  return score([
    {
      key: "stage_name",
      label: "Stage name",
      why: "It's the first thing a venue sees.",
      done: hasText(entertainer.stage_name),
      weight: 3,
    },
    {
      key: "categories",
      label: "What you do",
      why: "Without it you won't appear in any category filter.",
      done: (entertainer.categories?.length ?? 0) > 0,
      weight: 3,
    },
    {
      key: "location",
      label: "Where you're based",
      why: "Venues search by distance. No location means no results.",
      done: hasText(profile.location_text),
      weight: 3,
    },
    {
      key: "avatar",
      label: "Profile photo",
      why: "Profiles with a photo get noticeably more responses.",
      done: hasText(profile.avatar_url),
      weight: 2,
    },
    {
      key: "bio",
      label: "Bio",
      why: "A hundred words on what your set is like.",
      done: hasText(entertainer.bio, 50),
      weight: 2,
    },
    {
      key: "starting_price",
      label: "Starting price",
      why: "Venues filter by budget. Blank means you're filtered out.",
      done: (entertainer.starting_price ?? 0) > 0,
      weight: 2,
    },
    {
      key: "media",
      label: "A video or track",
      why: "Nothing sells a live act like seeing it.",
      done: media.length > 0,
      weight: 2,
    },
    {
      key: "event_types",
      label: "Event types you play",
      why: "Helps us match you to the right gigs.",
      done: (entertainer.event_types?.length ?? 0) > 0,
      weight: 1,
    },
    {
      key: "travel_radius",
      label: "Travel radius",
      why: "Stops you being matched to gigs you'd never take.",
      done: (entertainer.travel_radius_miles ?? 0) > 0,
      weight: 1,
    },
  ]);
}

export function venueCompleteness(
  profile: Pick<Profile, "location_text">,
  // venue_type is nullable here, unlike on the row: this is also called before
  // a venue profile exists, to show a brand-new venue what it still needs.
  venue: Omit<
    Pick<
      VenueProfile,
      "venue_name" | "venue_type" | "address_line_1" | "city" | "postcode" | "description" | "entertainment_preferences" | "venue_photos" | "website_url"
    >,
    "venue_type"
  > & { venue_type: VenueProfile["venue_type"] | null },
): Completeness {
  return score([
    {
      key: "venue_name",
      label: "Venue name",
      why: "Entertainers judge a gig by the venue behind it.",
      done: hasText(venue.venue_name),
      weight: 3,
    },
    {
      key: "address",
      label: "Address and postcode",
      why: "Used to work out how far entertainers would travel.",
      done: hasText(venue.address_line_1) && hasText(venue.postcode),
      weight: 3,
    },
    {
      key: "venue_type",
      label: "Venue type",
      why: "Acts filter for the kind of room they're suited to.",
      done: hasText(venue.venue_type),
      weight: 2,
    },
    {
      key: "description",
      label: "About the venue",
      why: "Room size, crowd, what a typical night looks like.",
      done: hasText(venue.description, 50),
      weight: 2,
    },
    {
      key: "photos",
      label: "Venue photos",
      why: "Acts want to see the stage before they apply.",
      done: (venue.venue_photos?.length ?? 0) > 0,
      weight: 2,
    },
    {
      key: "preferences",
      label: "Acts you usually book",
      why: "Puts your gigs in front of the right people.",
      done: (venue.entertainment_preferences?.length ?? 0) > 0,
      weight: 1,
    },
    {
      key: "website",
      label: "Website",
      why: "Optional, but it makes a venue look real.",
      done: hasText(venue.website_url),
      weight: 1,
    },
  ]);
}
