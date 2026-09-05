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
  /** Human-readable, e.g. "Rushmoor, Hampshire". */
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
 * Strips the country suffix off a stored location before searching.
 *
 * Locations are stored as "Town, Region" — and older rows as "Town, UK" —
 * because that is what reads well on a profile. postcodes.io's place search
 * matches on the place name alone and returns nothing for either form, so a
 * saved location fed straight back into search silently found nothing and the
 * distance filter was dropped without a word. That was a real bug.
 */
function placeNameOf(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const withoutCountry = trimmed.replace(
    /,\s*(uk|united kingdom|england|scotland|wales|northern ireland|gb|great britain)\s*$/i,
    "",
  );
  // Anything still carrying a comma is "Town, County" — the place name is the
  // part before it.
  return withoutCountry.split(",")[0]!.trim();
}

/** How a place is labelled back to the user. The county disambiguates duplicate names. */
function labelFor(place: PlaceResult): string {
  const qualifier = place.county_unitary ?? place.region;
  return qualifier ? `${place.name_1}, ${qualifier}` : place.name_1;
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

  const town = result.admin_district ?? result.region;

  return {
    // "Farnborough, South East" rather than "Farnborough, UK": the second half
    // earns its place by disambiguating, and it survives a round trip through
    // the place search.
    text: town && result.region && town !== result.region
      ? `${town}, ${result.region}`
      : (town ?? result.postcode),
    lat: result.latitude,
    lng: result.longitude,
    postcode: result.postcode,
  };
}

/**
 * Town and city search, for users who would rather type "Manchester" than a
 * postcode. Entertainers in particular do not want to publish a home postcode.
 *
 * Returns every match rather than just the first — several UK towns share a
 * name (there are two Rushmoors, 150 miles apart), and picking one blindly
 * silently searches the wrong half of the country.
 */
export async function searchPlaces(query: string, limit = 6): Promise<ResolvedLocation[]> {
  const clean = placeNameOf(query);
  if (clean.length < 2) return [];

  const response = await fetch(
    `${API}/places?q=${encodeURIComponent(clean)}&limit=${limit}`,
    { next: { revalidate: 60 * 60 * 24 } },
  );

  if (!response.ok) return [];

  const body = (await response.json()) as { result: PlaceResult[] | null };

  return (body.result ?? []).map((place) => ({
    text: labelFor(place),
    lat: place.latitude,
    lng: place.longitude,
  }));
}

/**
 * Single entry point for the forms: accepts either a postcode or a town name
 * and works out which it is.
 *
 * `near` optionally biases the results towards a known point — the searcher's
 * own saved location — so "Rushmoor" resolves to the one they meant rather
 * than the one that happens to sort first.
 */
export async function resolveLocation(
  input: string,
  near?: { lat: number; lng: number } | null,
): Promise<ResolvedLocation[]> {
  const clean = input.trim();
  if (!clean) return [];

  if (looksLikePostcode(clean)) {
    const exact = await lookupPostcode(clean);
    if (exact) return [exact];
  }

  const places = await searchPlaces(clean);

  if (!near || places.length < 2) return places;

  const distance = (p: ResolvedLocation) =>
    (p.lat - near.lat) ** 2 + (p.lng - near.lng) ** 2;

  return [...places].sort((a, b) => distance(a) - distance(b));
}
