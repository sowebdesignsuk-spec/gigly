import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";
import { loadContent } from "@/lib/cms/content";
import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";

const COLUMNS = [
  {
    heading: "Find work",
    links: [
      { href: "/gigs", label: "All gigs" },
      { href: "/gigs?radius=30", label: "Gigs near me" },
      { href: "/signup?type=entertainer", label: "Join as an entertainer" },
    ],
  },
  {
    heading: "Book an act",
    links: [
      { href: "/entertainers", label: "Browse acts" },
      { href: "/signup?type=venue", label: "Join as a venue" },
      { href: "/venue/gigs/new", label: "Post a gig" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "GIGLY",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
    ],
  },
];

export async function SiteFooter() {
  const t = await loadContent("footer");

  return (
    <footer className="border-t border-ink-700 bg-ink-950/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark className="text-2xl" />
            <p className="mt-3 max-w-xs text-sm text-chalk-dim">{t("footer.tagline")}</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h2 className="text-xs font-semibold tracking-widest text-chalk-faint uppercase">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-chalk-dim transition-colors hover:text-chalk"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Category links: useful to a person, and the internal linking that
            makes the filtered gig pages discoverable. */}
        <div className="mt-12 border-t border-ink-700 pt-8">
          <h2 className="text-xs font-semibold tracking-widest text-chalk-faint uppercase">
            Browse by act
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {ENTERTAINER_CATEGORIES.filter((c) => c.value !== "other").map((category) => (
              <li key={category.value}>
                <Link
                  href={`/gigs?category=${category.value}`}
                  className="text-sm text-chalk-faint transition-colors hover:text-chalk-dim"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-xs text-chalk-faint">
          © {new Date().getFullYear()} GIGLY
        </p>
      </div>
    </footer>
  );
}
