import Image from "next/image";

import { AVATARS_BUCKET, publicImageUrl } from "@/lib/supabase/storage";

/**
 * An act's picture, with a generated fallback.
 *
 * Most profiles have no photo on day one, and a grid of empty grey circles
 * makes a marketplace look abandoned. The fallback is derived from the name,
 * so it is stable across renders and different for every act — it reads as a
 * chosen identity rather than a missing image, while still being obviously not
 * a photograph.
 *
 * Deliberately not a random stock photo of a band: putting a face on a profile
 * that isn't theirs misrepresents the act to the venue booking them.
 */

/** Two brand-adjacent hues per name, mixed into a gradient. Stable, not random. */
function hueFor(name: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  // 320–350 is the brand pink; the range walks up through purple and back,
  // so every avatar stays inside GIGLY's world.
  const base = 260 + (Math.abs(hash) % 110);
  return [base % 360, (base + 38) % 360];
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

export function ActAvatar({
  name,
  path,
  size = 64,
  className = "",
}: {
  name: string;
  path?: string | null;
  size?: number;
  className?: string;
}) {
  const src = publicImageUrl(AVATARS_BUCKET, path);

  if (src) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-900 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }

  const [h1, h2] = hueFor(name);

  return (
    <div
      aria-hidden
      className={`relative shrink-0 overflow-hidden rounded-full border border-ink-600 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, oklch(0.55 0.19 ${h1}), oklch(0.38 0.15 ${h2}))`,
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-white/90"
        style={{ fontSize: Math.round(size * 0.36) }}
      >
        {initialsOf(name)}
      </span>
    </div>
  );
}

/**
 * Venue equivalent. Venues have photo galleries rather than avatars, so this
 * covers the case where a venue has uploaded nothing at all.
 */
export function VenueThumb({
  name,
  src,
  className = "",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-ink-900 ${className}`}>
        <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 320px" className="object-cover" />
      </div>
    );
  }

  const [h1, h2] = hueFor(name);

  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.32 0.12 ${h1}), oklch(0.20 0.08 ${h2}))`,
      }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white/30">
        {initialsOf(name)}
      </span>
    </div>
  );
}
