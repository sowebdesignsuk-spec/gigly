"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { parsePoundsToPence } from "@/lib/profile/constants";
import type { ApplicationStatus } from "@/lib/types/database";

export type ApplyState = { error?: string; success?: string };

/** Section 5, Week 4.1–4.2 — entertainer applies to a gig. */
export async function applyToGig(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Log in to apply." };

  const gigId = String(formData.get("gig_id") ?? "");
  if (!gigId) return { error: "That gig no longer exists." };

  const { data: entertainer } = await supabase
    .from("entertainer_profiles")
    .select("id, stage_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!entertainer) {
    return { error: "Set up your profile before applying — venues need something to look at." };
  }

  const proposedFee = parsePoundsToPence(String(formData.get("proposed_fee") ?? ""));
  const message = String(formData.get("message") ?? "").trim();

  const { error } = await supabase.from("applications").insert({
    gig_id: gigId,
    entertainer_id: entertainer.id,
    message: message || null,
    proposed_fee: proposedFee,
  });

  if (error) {
    // 23505 is the applications_one_per_gig unique constraint. Reaching it means
    // a double submit or a back-button resubmit, neither of which is an error
    // worth alarming anyone about.
    if (error.code === "23505") {
      return { success: "You've already applied to this gig." };
    }
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath("/entertainer/applications");

  return { success: "Applied. The venue can see your profile now." };
}

/** Entertainer withdraws — Section 4.5 status 'withdrawn'. */
export async function withdrawApplication(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  if (!applicationId) return;

  const supabase = await createClient();
  await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);

  revalidatePath("/entertainer/applications");
}

const VENUE_SETTABLE: ApplicationStatus[] = ["viewed", "shortlisted", "offered", "declined"];

/** Section 5, Week 4.4 and 4.7 — venue shortlists, declines, or makes an offer. */
export async function setApplicationStatus(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;

  if (!applicationId || !VENUE_SETTABLE.includes(status)) return;

  const supabase = await createClient();

  // RLS restricts updates to applications on this venue's own gigs, so no
  // ownership check is needed here — a forged id updates nothing.
  const patch: { status: ApplicationStatus; viewed_at?: string } = { status };
  if (status === "viewed") patch.viewed_at = new Date().toISOString();

  await supabase.from("applications").update(patch).eq("id", applicationId);

  revalidatePath("/venue/gigs");
}

/**
 * Section 5, Week 4.8 — entertainer accepts or declines an offer.
 *
 * Accepting creates the booking. That belongs to Week 5, so for now the
 * application is marked accepted and the booking is created there.
 */
export async function respondToOffer(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const accept = String(formData.get("response") ?? "") === "accept";

  if (!applicationId) return;

  const supabase = await createClient();
  await supabase
    .from("applications")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", applicationId);

  revalidatePath("/entertainer/applications");
}

/** Marks every unseen application on a gig as viewed — Section 4.5 viewed_at. */
export async function markApplicationsViewed(gigId: string) {
  const supabase = await createClient();

  await supabase
    .from("applications")
    .update({ status: "viewed", viewed_at: new Date().toISOString() })
    .eq("gig_id", gigId)
    .eq("status", "sent");
}
