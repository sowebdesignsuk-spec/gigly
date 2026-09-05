"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, GigVisibility } from "@/lib/types/database";

/**
 * Admin actions — Section 5, Week 9.1–9.2.
 *
 * Each of these calls a SECURITY DEFINER function that re-checks is_admin()
 * itself. The role check in the proxy keeps non-admins off the pages; the
 * check inside the function is what stops a non-admin calling the RPC
 * directly through PostgREST.
 */

export async function setUserStatus(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "") as AccountStatus;

  if (!userId || !["active", "suspended"].includes(status)) return;

  const supabase = await createClient();
  await supabase.rpc("admin_set_user_status", { p_user_id: userId, p_status: status });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function eraseUser(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  // A typed confirmation, because there is no undo.
  const confirm = String(formData.get("confirm") ?? "");

  if (!userId || confirm !== "ERASE") return;

  const supabase = await createClient();
  await supabase.rpc("admin_erase_user", { p_user_id: userId });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function moderateGig(formData: FormData) {
  const gigId = String(formData.get("gig_id") ?? "");
  const visibility = String(formData.get("visibility") ?? "") as GigVisibility;

  if (!gigId || !["published", "closed", "cancelled"].includes(visibility)) return;

  const supabase = await createClient();
  await supabase.rpc("admin_set_gig_visibility", { p_gig_id: gigId, p_visibility: visibility });

  revalidatePath("/admin/gigs");
  revalidatePath("/gigs");
}

export async function setReviewVisibility(formData: FormData) {
  const reviewId = String(formData.get("review_id") ?? "");
  const visible = String(formData.get("visible") ?? "") === "true";

  if (!reviewId) return;

  // Admins have a direct UPDATE policy on reviews (reviews_admin_moderate), so
  // no wrapper function is needed. The rating trigger recomputes the average.
  const supabase = await createClient();
  await supabase.from("reviews").update({ is_visible: visible }).eq("id", reviewId);

  revalidatePath("/admin/reviews");
}

/** Loads the demo dataset. Idempotent — a second call is a no-op. */
export async function loadDemoData() {
  const supabase = await createClient();
  await supabase.rpc("seed_demo_data");
  revalidatePath("/admin");
  revalidatePath("/gigs");
}

/** Removes every @demo.gigly.invalid account and everything hanging off it. */
export async function removeDemoData() {
  const supabase = await createClient();
  await supabase.rpc("remove_demo_data");
  revalidatePath("/admin");
  revalidatePath("/gigs");
}
