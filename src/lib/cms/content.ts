import { createClient } from "@/lib/supabase/server";
import { CONTENT_DEFAULTS, type ContentKey } from "./defaults";

/**
 * Reads the site copy for one page: defaults from code, overrides from the
 * site_content table layered on top.
 *
 * One query per page render, filtered to the page's prefix, so the homepage
 * never pays for the pricing page's overrides. If the table is unreachable the
 * defaults render — a database blip must not take the front door down.
 */
export async function loadContent(prefix: string) {
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
}
