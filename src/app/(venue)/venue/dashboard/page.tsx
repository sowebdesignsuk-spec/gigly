import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

/** Venue home — Section 5, Week 1.9. Empty until Week 3 gives it gigs to show. */
export default async function VenueDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_complete")
    .eq("id", user.id)
    .single();

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold">
          Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Post a gig, review applicants, make offers.
        </p>

        {!profile?.onboarding_complete ? (
          <div className="mt-8 rounded-xl border border-hot-500/40 bg-hot-500/10 p-5">
            <p className="font-semibold text-chalk">Your venue profile isn&apos;t finished</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Entertainers judge a gig by the venue behind it. The venue profile
              form lands in Week 2.
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Post a gig", href: "/venue/gigs/new" },
            { label: "My gigs", href: "/venue/gigs" },
            { label: "Venue profile", href: "/venue/profile" },
          ].map(
            (panel) => (
              <Link
                key={panel.href}
                href={panel.href}
                className="rounded-xl border border-ink-700 bg-ink-800 p-5 transition-colors hover:border-hot-500"
              >
                <p className="text-sm font-medium text-chalk">{panel.label}</p>
              </Link>
            ),
          )}
        </div>
      </main>
    </>
  );
}
