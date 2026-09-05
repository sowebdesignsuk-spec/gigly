/**
 * Storage path → public URL.
 *
 * Section 4.1 and 4.3 store storage *paths*, not URLs, so the database stays
 * portable across Supabase projects — a restore into a new project would
 * otherwise leave every image pointing at the old one.
 */
export function publicImageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;

  // Tolerate rows that already hold a full URL, in case any get written that way.
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export const AVATARS_BUCKET = "avatars";
export const VENUE_PHOTOS_BUCKET = "venue-photos";
