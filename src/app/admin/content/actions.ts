"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { CONTENT_DEFAULTS } from "@/lib/cms/defaults";

/** Which public paths a key affects, so the right page is revalidated. */
function pathsFor(key: string): string[] {
  const page = key.split(".")[0];
  if (page === "footer") return ["/", "/about", "/pricing", "/contact"];
  return [page === "home" ? "/" : `/${page}`];
}

/** Save one block. Saving text identical to the default removes the override. */
export async function saveContent(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");

  if (!(key in CONTENT_DEFAULTS)) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (value.trim() === CONTENT_DEFAULTS[key as keyof typeof CONTENT_DEFAULTS]) {
    await supabase.from("site_content").delete().eq("key", key);
  } else {
    await supabase
      .from("site_content")
      .upsert({ key, value, updated_by: user?.id ?? null }, { onConflict: "key" });
  }

  for (const path of pathsFor(key)) revalidatePath(path);
  revalidatePath("/admin/content");
}

/** Drop the override; the code default renders again. */
export async function resetContent(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!(key in CONTENT_DEFAULTS)) return;

  const supabase = await createClient();
  await supabase.from("site_content").delete().eq("key", key);

  for (const path of pathsFor(key)) revalidatePath(path);
  revalidatePath("/admin/content");
}
