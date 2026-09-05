import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { CONTENT_DEFAULTS, type ContentKey } from "./defaults";

/**
 * Reads the site copy for one page: defaults from code, overrides from the
 * site_content table layered on top.
 *
 * One query per prefix per request — cached, so a page and its footer asking
 * for the same prefix share a single round trip. The homepage and footer use
 * different prefixes, which is why the cache is keyed on the argument.
 *
 * If the table is unreachable the defaults render — a database blip must not
 * take the front door down.
 */
export const loadContent = cache(async (prefix: string) => {
  const overrides = new Map<string, string>();

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_content")
      .select("key, value")
      .like("key", `${prefix}.%`);

    for (const row of data ?? []) overrides.set(row.key, row.value);
  } catch {
    // Fall through to defaults.
  }

  return function t(key: ContentKey): string {
    return overrides.get(key) ?? CONTENT_DEFAULTS[key];
  };
});
