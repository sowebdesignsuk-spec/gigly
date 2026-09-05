"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ENTERTAINER_CATEGORIES, parsePoundsToPence } from "@/lib/profile/constants";
import { lookupPostcode } from "@/lib/utils/postcode";

export type GigState = { error?: string };

const VALID_CATEGORIES = new Set<string>(ENTERTAINER_CATEGORIES.map((c) => c.value));
const UK_POSTCODE = /^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i;

/** Section 5, Week 3.1–3.2 — post a gig, as a draft or published. */
export async function saveGig(_prev: GigState, formData: FormData): Promise<GigState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You're not signed in." };

  const { data: venue } = await supabase
    .from("venue_profiles")
    .select("id, postcode")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!venue) {
    return { error: "Set up your venue profile before posting a gig." };
  }

  const gigId = String(formData.get("gig_id") ?? "") || null;
  const publish = formData.get("intent") === "publish";

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 4) return { error: "Give the gig a title acts will recognise." };

  const category = String(formData.get("category") ?? "");
  if (!VALID_CATEGORIES.has(category)) return { error: "Pick the kind of act you need." };

  const description = String(formData.get("description") ?? "").trim();
  if (description.length < 20) {
    return { error: "Add a description — acts won't apply to a blank listing." };
  }

  const date = String(formData.get("date") ?? "");
  if (!date) return { error: "Pick a date." };
  // Compared as strings: both are ISO yyyy-mm-dd, and this avoids a timezone
  // turning "today" into yesterday for a venue posting late at night.
  if (date < new Date().toISOString().slice(0, 10)) {
    return { error: "That date has already passed." };
  }

  const startTime = String(formData.get("start_time") ?? "");
  if (!startTime) return { error: "Add a start time." };
  const endTime = String(formData.get("end_time") ?? "") || null;

  const budgetMin = parsePoundsToPence(String(formData.get("budget_min") ?? ""));
  if (budgetMin === null) {
    // Section 1.2 is explicit that a blank fee kills application rates.
    return { error: "Enter a fee. A gig with no fee gets far fewer applications." };
  }

  const budgetMax = parsePoundsToPence(String(formData.get("budget_max") ?? ""));
  if (budgetMax !== null && budgetMax < budgetMin) {
    return { error: "The top of the range can't be below the bottom." };
  }

  const postcode = (String(formData.get("postcode") ?? "").trim() || venue.postcode).toUpperCase();
  if (!UK_POSTCODE.test(postcode)) {
    return { error: "That doesn't look like a UK postcode." };
  }

  const geocoded = await lookupPostcode(postcode);
  if (!geocoded) return { error: `We couldn't find ${postcode}. Check it and try again.` };

  const row = {
    venue_id: venue.id,
    title,
    category,
    description,
    date,
    start_time: startTime,
    end_time: endTime,
    location_text: geocoded.text,
    location_lat: geocoded.lat,
    location_lng: geocoded.lng,
    budget_min: budgetMin,
    budget_max: budgetMax,
    audience_size: String(formData.get("audience_size") ?? "").trim() || null,
    requirements: String(formData.get("requirements") ?? "").trim() || null,
    inclusions: String(formData.get("inclusions") ?? "").trim() || null,
    is_urgent: formData.get("is_urgent") === "on",
    visibility: publish ? ("published" as const) : ("draft" as const),
  };

  // RLS restricts both branches to gigs owned by this venue, so a forged
  // gig_id belonging to someone else updates nothing rather than succeeding.
  const { data: saved, error } = gigId
    ? await supabase.from("gigs").update(row).eq("id", gigId).select("id").maybeSingle()
    : await supabase.from("gigs").insert(row).select("id").maybeSingle();

  if (error) return { error: error.message };
  if (!saved) return { error: "That gig couldn't be saved." };

  revalidatePath("/venue/gigs");
  revalidatePath("/gigs");
  redirect(`/venue/gigs?saved=${publish ? "published" : "draft"}`);
}

/** Section 5, Week 3.2 — publish, close or cancel an existing listing. */
export async function setGigVisibility(formData: FormData) {
  const gigId = String(formData.get("gig_id") ?? "");
  const visibility = String(formData.get("visibility") ?? "");

  if (!["draft", "published", "closed", "cancelled"].includes(visibility)) return;

  const supabase = await createClient();
  await supabase
    .from("gigs")
    .update({ visibility: visibility as "draft" | "published" | "closed" | "cancelled" })
    .eq("id", gigId);

  revalidatePath("/venue/gigs");
  revalidatePath("/gigs");
}
