import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types/database";

const NAV: Record<AccountType, { href: string; label: string; badge?: "messages" | "alerts" }[]> = {
  entertainer: [
    { href: "/entertainer/dashboard", label: "Home" },
    { href: "/gigs", label: "Find gigs" },
    { href: "/entertainer/applications", label: "Applications" },
    { href: "/entertainer/bookings", label: "Bookings" },
    { href: "/entertainer/diary", label: "Diary" },
    { href: "/messages", label: "Messages", badge: "messages" },
    { href: "/notifications", label: "Alerts", badge: "alerts" },
    { href: "/entertainer/profile", label: "Profile" },
  ],
  venue: [
    { href: "/venue/dashboard", label: "Home" },
    { href: "/venue/gigs", label: "My gigs" },
    { href: "/venue/gigs/new", label: "Post a gig" },
    { href: "/venue/bookings", label: "Bookings" },
    { href: "/messages", label: "Messages", badge: "messages" },
    { href: "/notifications", label: "Alerts", badge: "alerts" },
    { href: "/venue/profile", label: "Profile" },
  ],
};

/**
 * Signed-in header with unread counts — Section 5, Week 6.6 and 7.1.
 *
 * Two small queries per render. Both are index-backed partial scans
 * (notifications_unread_idx; the messages read_at filter), so the cost is
 * proportional to what's unread, not to history.
 */
export async function AppHeader({ name, accountType }: { name: string; accountType: AccountType }) {
  const supabase = await createClient();

  const [{ data: unreadMessages }, { count: unreadAlerts }] = await Promise.all([
    supabase.rpc("unread_message_count"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const badges = {
    messages: unreadMessages ?? 0,
    alerts: unreadAlerts ?? 0,
  };

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

      <nav className="overflow-x-auto px-6 pb-3">
        <ul className="flex gap-5 whitespace-nowrap">
          {NAV[accountType].map((item) => {
            const count = item.badge ? badges[item.badge] : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-sm text-chalk-dim transition-colors hover:text-chalk"
                >
                  {item.label}
                  {count > 0 ? (
                    <span className="rounded-full bg-hot-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
