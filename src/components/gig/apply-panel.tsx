import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ApplyForm } from "./apply-form";

const STATUS_COPY: Record<string, string> = {
  sent: "Applied. The venue hasn't opened it yet.",
  viewed: "The venue has read your application.",
  shortlisted: "You've been shortlisted.",
  offered: "You've been offered this gig — check your applications to respond.",
  accepted: "You accepted this gig.",
  declined: "The venue went with someone else this time.",
  withdrawn: "You withdrew this application.",
};

/**
 * The apply call-to-action on a gig page — Section 5, Week 3.6 and 4.1.
 *
 * A server component so the page's first render already knows whether this
 * person can apply, has applied, or needs an account. Rendering an Apply button
 * and only then discovering they already applied is the worst of the options.
 */
export async function ApplyPanel({
  gigId,
  isSignedIn,
}: {
  gigId: string;
  isSignedIn: boolean;
}) {
  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-800 p-6">
        <p className="font-semibold text-chalk">Want this gig?</p>
        <p className="mt-1 text-sm text-chalk-dim">
          Create a free entertainer account and apply in about a minute.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/signup?type=entertainer"
            className="rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
          >
            Create an account
          </Link>
          <Link
            href={`/login?next=/gigs/${gigId}`}
            className="rounded-xl bg-ink-700 px-5 py-3 text-sm font-semibold text-chalk hover:bg-ink-600"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: entertainer }] = await Promise.all([
    supabase.from("profiles").select("account_type").eq("id", user.id).single(),
    supabase.from("entertainer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  // A venue looking at someone else's listing. Nothing to apply with.
  if (profile?.account_type !== "entertainer") return null;

  if (!entertainer) {
    return (
      <div className="rounded-xl border border-hot-500/40 bg-hot-500/10 p-6">
        <p className="font-semibold text-chalk">Finish your profile to apply</p>
        <p className="mt-1 text-sm text-chalk-dim">
          Venues decide from your profile. Applying without one gets you nowhere.
        </p>
        <Link
          href="/entertainer/profile"
          className="mt-4 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
        >
          Set up profile
        </Link>
      </div>
    );
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("status")
    .eq("gig_id", gigId)
    .eq("entertainer_id", entertainer.id)
    .maybeSingle();

  if (existing) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-800 p-6">
        <p className="font-semibold text-chalk">
          {STATUS_COPY[existing.status] ?? "You've applied to this gig."}
        </p>
        <Link
          href="/entertainer/applications"
          className="mt-3 inline-block text-sm text-hot-500 hover:text-hot-400"
        >
          See all your applications
        </Link>
      </div>
    );
  }

  return <ApplyForm gigId={gigId} />;
}
