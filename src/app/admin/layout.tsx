import Link from "next/link";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { HOME_FOR } from "@/lib/supabase/session";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/gigs", label: "Gigs" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/errors", label: "Errors" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * Admin shell — Section 5, Week 9.1: "separate route group with admin role
 * check". The proxy already redirects non-admins; this re-checks so the pages
 * stay safe if the proxy matcher is ever changed.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("full_name, account_type").eq("id", user.id).single(),
    supabase.from("profile_private").select("role").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!profile || priv?.role !== "admin") {
    redirect(profile ? HOME_FOR[profile.account_type] : "/");
  }

  return (
    <>
      <header className="border-b border-hold/30 bg-hold/5">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Wordmark className="text-xl" />
            </Link>
            <span className="rounded-full bg-hold/15 px-2.5 py-0.5 text-xs font-semibold text-hold">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-chalk-dim sm:inline">{profile.full_name}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
                Log out
              </Button>
            </form>
          </div>
        </div>

        <nav className="overflow-x-auto px-6 pb-3">
          <ul className="flex gap-5 whitespace-nowrap">
            {NAV.map((item) => (
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </>
  );
}
