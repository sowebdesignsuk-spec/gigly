import Image from "next/image";
import Link from "next/link";

import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";
import { categoryShot, stockUrl } from "@/lib/media/stock";

/**
 * Browse-by-act-type, as image tiles.
 *
 * Decorative and functional at once: it gives the homepage a band of colour
 * and texture, and every tile is a real filtered search. Someone who knows
 * they want a DJ should not have to read a paragraph first.
 *
 * Counts come from live data and are omitted where zero, so the grid never
 * advertises a category with nothing behind it.
 */
export function CategoryTiles({ counts }: { counts: Record<string, number> }) {
  const shown = ENTERTAINER_CATEGORIES.filter((c) => c.value !== "other");

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {shown.map((category) => {
        const shot = categoryShot(category.value);
        const n = counts[category.value] ?? 0;

        return (
          <li key={category.value}>
            <Link
              href={`/gigs?category=${category.value}`}
              className="group relative block aspect-4/3 overflow-hidden rounded-xl border border-ink-700 transition-colors hover:border-hot-500"
            >
              <Image
                src={stockUrl(shot.id, 400, 300)}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 220px"
                className="object-cover opacity-55 transition-all duration-300 group-hover:scale-105 group-hover:opacity-75"
              />
              {/* Keeps the label legible over any photo, and keeps the tiles
                  reading as one set rather than eight different exposures. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                <span className="text-sm font-semibold text-chalk">{category.label}</span>
                {n > 0 ? (
                  <span className="rounded-full bg-hot-500/20 px-2 py-0.5 text-[11px] font-bold text-hot-300 tabular-nums">
                    {n}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
