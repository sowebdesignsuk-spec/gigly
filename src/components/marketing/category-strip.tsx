import Link from "next/link";

import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";

/**
 * Browse-by-act-type strip.
 *
 * Decorative and functional at once: it gives the homepage a band of colour
 * and texture, and every chip is a real filtered search. Someone who knows
 * they want a DJ should not have to read a paragraph first.
 */
export function CategoryStrip({ counts }: { counts?: Record<string, number> }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {ENTERTAINER_CATEGORIES.filter((c) => c.value !== "other").map((category) => {
        const n = counts?.[category.value] ?? 0;

        return (
          <li key={category.value}>
            <Link
              href={`/gigs?category=${category.value}`}
              className="group inline-flex items-baseline gap-2 rounded-full border border-ink-600 bg-ink-800/60 px-4 py-2 text-sm text-chalk-dim transition-colors hover:border-hot-500 hover:text-chalk"
            >
              {category.label}
              {n > 0 ? (
                <span className="text-xs text-chalk-faint tabular-nums transition-colors group-hover:text-hot-400">
                  {n}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
