/**
 * Great-circle distance in miles.
 *
 * Used where a handful of distances are needed for display — the applicant
 * list, a profile card — and a round trip to PostGIS for each would be silly.
 * Search still goes through search_gigs, where the spatial index matters.
 */
export function milesBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.7613; // Earth radius, miles

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}
