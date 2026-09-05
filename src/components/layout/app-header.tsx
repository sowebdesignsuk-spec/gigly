import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import type { AccountType } from "@/lib/types/database";

const NAV: Record<AccountType, { href: string; label: string }[]> = {
  entertainer: [
    { href: "/entertainer/dashboard", label: "Home" },
    { href: "/gigs", label: "Find gigs" },
    { href: "/entertainer/applications", label: "Applications" },
    { href: "/entertainer/bookings", label: "Bookings" },
    { href: "/entertainer/diary", label: "Diary" },
    { href: "/messages", label: "Messages" },
    { href: "/notifications", label: "Alerts" },
    { href: "/entertainer/profile", label: "Profile" },
  ],
  venue: [
    { href: "/venue/dashboard", label: "Home" },
    { href: "/venue/gigs", label: "My gigs" },
    { href: "/venue/gigs/new", label: "Post a gig" },
    { href: "/venue/bookings", label: "Bookings" },
    { href: "/messages", label: "Messages" },
    { href: "/notifications", label: "Alerts" },
    { href: "/venue/profile", label: "Profile" },
  ],
};

export function AppHeader({
  name,
  accountType,
}: {
  name: string;
  accountType: AccountType;
}) {
  return (
    <header className="border-b border-ink-700">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Wordmark className="text-xl" />
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-chalk-dim sm:inline">{name}</span>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
              Log out
            </Button>
          </form>
        </div>
      </div>

      {/* Scrolls rather than wraps on narrow screens, so the header stays one
          row tall on a phone. */}
      <nav className="overflow-x-auto px-6 pb-3">
        <ul className="flex gap-5 whitespace-nowrap">
          {NAV[accountType].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-chalk-dim transition-colors hover:text-chalk"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
