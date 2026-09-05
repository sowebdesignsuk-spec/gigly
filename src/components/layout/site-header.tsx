import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";
import { createClient } from "@/lib/supabase/server";
import { HOME_FOR } from "@/lib/supabase/session";

const NAV = [
  { href: "/gigs", label: "Find gigs" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

/**
 * Header for the public site. Shows the dashboard link to anyone signed in so
 * the marketing pages never dead-end a real user at a "Log in" button.
 */
export async function SiteHeader() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let home: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();
    home = profile ? HOME_FOR[profile.account_type] : null;
  }

  return (
    <header className="border-b border-ink-700">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/">
          <Wordmark className="text-xl" />
        </Link>

        <nav className="hidden md:block">
          <ul className="flex gap-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-chalk-dim hover:text-chalk">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {home ? (
            <Link
              href={home}
              className="rounded-xl bg-hot-500 px-4 py-2 text-sm font-semibold text-white hover:bg-hot-400"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-chalk-dim hover:text-chalk">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-hot-500 px-4 py-2 text-sm font-semibold text-white hover:bg-hot-400"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="overflow-x-auto px-6 pb-3 md:hidden">
        <ul className="flex gap-5 whitespace-nowrap">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-sm text-chalk-dim hover:text-chalk">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
