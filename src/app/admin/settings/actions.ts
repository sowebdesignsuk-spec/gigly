"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isKnownSetting, settingDefault } from "@/lib/settings/registry";

/** Save one group of settings. Values equal to the default are removed. */
export async function saveSettings(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const keys = formData.getAll("__keys").map(String);

  const upserts: { key: string; value: string; updated_by: string }[] = [];
  const deletes: string[] = [];

  for (const key of keys) {
    if (!isKnownSetting(key)) continue;

    // An unchecked checkbox posts nothing at all, which is how a toggle turns
    // off. The hidden __keys list is what tells us it was on the form.
    const raw = formData.get(key);
    const value = raw === null ? "false" : String(raw).trim();

    if (value === settingDefault(key)) deletes.push(key);
    else upserts.push({ key, value, updated_by: user.id });
  }

  if (upserts.length) await supabase.from("app_settings").upsert(upserts, { onConflict: "key" });
  if (deletes.length) await supabase.from("app_settings").delete().in("key", deletes);

  // Settings reach the public pages, robots and the sitemap.
  for (const path of ["/", "/about", "/pricing", "/contact", "/gigs", "/entertainers"]) {
    revalidatePath(path);
  }
  revalidatePath("/admin/settings");
}
