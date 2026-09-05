import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Entertainer home — Section 5, Week 1.9. Intentionally empty: the widgets that
 * belong here (next gig, availability, recommended gigs) are Week 7, and there
 * is no data to put in them until profiles and gigs exist.
 */
export default async function EntertainerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route. Re-checking here is not redundant:
  // it is what makes the page safe if the matcher is ever changed.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_complete")
    .eq("id", user.id)
    .single();

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold">
          Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Your diary is empty — because we haven&apos;t built it yet.
        </p>

        {!profile?.onboarding_complete ? (
          <div className="mt-8 rounded-xl border border-hot-500/40 bg-hot-500/10 p-5">
            <p className="font-semibold text-chalk">Your profile isn&apos;t finished</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Venues can&apos;t find you until it is. The profile wizard lands in
              Week 2.
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {["Next gig", "This week", "Recommended gigs", "Recent activity"].map(
            (panel) => (
              <div
                key={panel}
                className="rounded-xl border border-ink-700 bg-ink-800 p-5"
              >
                <p className="text-sm font-medium text-chalk">{panel}</p>
                <p className="mt-1 text-xs text-chalk-faint">Coming in Week 7</p>
              </div>
            ),
          )}
        </div>
      </main>
    </>
  );
}
