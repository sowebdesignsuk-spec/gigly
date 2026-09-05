import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { settingDefault } from "./registry";

export type Settings = {
  get: (key: string) => string;
  bool: (key: string) => boolean;
};

/**
 * Reads app settings: defaults from code, overrides from the database.
 *
 * Wrapped in React's `cache`, so the root layout, the page, the header and the
 * footer all share one query per request instead of each firing their own.
 * Before this, rendering the homepage hit app_settings three times.
 *
 * If the table is unreachable the defaults apply — a database blip must not
 * change the site's indexing rules or take the front page down.
 */
export const loadSettings = cache(async (): Promise<Settings> => {
  const overrides = new Map<string, string>();

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key, value");
    for (const row of data ?? []) {
      if (row.value !== "") overrides.set(row.key, row.value);
    }
  } catch {
    // Defaults it is.
  }

  const get = (key: string) => overrides.get(key) ?? settingDefault(key);

  return { get, bool: (key: string) => get(key) === "true" };
});

/** Which secrets are present, without ever revealing a value. */
export function secretStatus(envVar: string): boolean {
  return Boolean(process.env[envVar]?.trim());
}
