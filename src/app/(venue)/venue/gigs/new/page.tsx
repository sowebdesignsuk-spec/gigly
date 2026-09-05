import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { GigForm } from "./gig-form";

export const metadata: Metadata = { title: "Post a gig" };

/** Section 5, Week 3.1 — post a gig. */
export default async function NewGigPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: venue }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("venue_profiles").select("postcode").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="venue" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Post a gig</h1>
          <p className="text-sm text-chalk-dim">
            Publish it and acts can apply straight away, or save a draft and come
            back to it.
          </p>
        </div>

        {!venue ? (
          <div className="mt-8 rounded-xl border border-hot-500/40 bg-hot-500/10 p-5">
            <p className="font-semibold text-chalk">Set up your venue first</p>
            <p className="mt-1 text-sm text-chalk-dim">
              A gig inherits its address from your venue profile, and acts want to
              know where they&apos;d be playing.
            </p>
            <Link
              href="/venue/profile"
              className="mt-4 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
            >
              Set up venue profile
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <GigForm
              defaults={{
                title: "",
                category: "",
                description: "",
                date: "",
                startTime: "20:00",
                endTime: "",
                budgetMinPounds: "",
                budgetMaxPounds: "",
                audienceSize: "",
                requirements: "",
                inclusions: "",
                isUrgent: false,
                postcode: "",
                venuePostcode: venue.postcode,
              }}
            />
          </div>
        )}
      </main>
    </>
  );
}
