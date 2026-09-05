/**
 * UK location lookup via postcodes.io.
 *
 * The build plan specifies Google Maps Places for this (Section 5, Week 2.9),
 * but Places needs a billed API key and GIGLY's launch market is UK-only.
 * postcodes.io is free, keyless, unmetered and ONS-derived, so it covers every
 * UK postcode and town without a billing account in the loop.
 *
 * Keep the Maps credit for the gig-detail map in Week 3, where an actual map is
 * being drawn and there is no free equivalent.
 */

const API = "https://api.postcodes.io";

export type ResolvedLocation = {
  /** Human-readable, e.g. "Manchester, Greater Manchester". */
  text: string;
  lat: number;
  lng: number;
  /** Present only when resolved from a postcode. */
  postcode?: string;
};

type PostcodeResult = {
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  admin_district: string | null;
  region: string | null;
  country: string;
};

type PlaceResult = {
  name_1: string;
  county_unitary: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
};

/** True for anything shaped like a UK postcode. Deliberately loose — the API is the real validator. */
export function looksLikePostcode(input: string): boolean {
  return /^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i.test(input.trim());
}

/**
 * Resolves a full UK postcode to coordinates.
 * Returns null for anything postcodes.io does not recognise — including valid-
 * looking but non-existent postcodes, which is the common typo case.
 */
export async function lookupPostcode(postcode: string): Promise<ResolvedLocation | null> {
  const clean = postcode.trim();
  if (!clean) return null;

  const response = await fetch(`${API}/postcodes/${encodeURIComponent(clean)}`, {
    // Postcode coordinates effectively never change, so cache hard.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) return null;

  const body = (await response.json()) as { result: PostcodeResult | null };
  const result = body.result;

  if (!result?.latitude || !result.longitude) return null;

  const town = result.admin_district ?? result.region ?? result.country;

  return {
    text: town ? `${town}, UK` : result.postcode,
    lat: result.latitude,
    lng: result.longitude,
    postcode: result.postcode,
  };
}

/**
 * Town and city search, for users who would rather type "Manchester" than a
 * postcode. Entertainers in particular do not want to publish a home postcode.
 */
export async function searchPlaces(query: string, limit = 6): Promise<ResolvedLocation[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const response = await fetch(
    `${API}/places?q=${encodeURIComponent(clean)}&limit=${limit}`,
    { next: { revalidate: 60 * 60 * 24 } },
  );

  if (!response.ok) return [];

  const body = (await response.json()) as { result: PlaceResult[] | null };

  return (body.result ?? []).map((place) => ({
    text: [place.name_1, place.county_unitary ?? place.region]
      .filter(Boolean)
      .join(", "),
    lat: place.latitude,
    lng: place.longitude,
  }));
}

/**
 * Single entry point for the profile forms: accepts either a postcode or a
 * town name and works out which it is.
 */
export async function resolveLocation(input: string): Promise<ResolvedLocation[]> {
  const clean = input.trim();
  if (!clean) return [];

  if (looksLikePostcode(clean)) {
    const exact = await lookupPostcode(clean);
    if (exact) return [exact];
  }

  return searchPlaces(clean);
}
