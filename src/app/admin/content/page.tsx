import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_DEFAULTS, CONTENT_GROUPS, type ContentKey } from "@/lib/cms/defaults";
import { resetContent, saveContent } from "./actions";

export const metadata: Metadata = { title: "Content · Admin" };

/**
 * The CMS. One textarea per block, grouped by page. A block that has been
 * overridden shows a Reset button; one that hasn't shows the default.
 */
export default async function AdminContentPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, value, updated_at");

  const overrides = new Map((data ?? []).map((r) => [r.key, r]));
  const keys = Object.keys(CONTENT_DEFAULTS) as ContentKey[];

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Site content</h1>
        <p className="text-sm text-chalk-dim">
          Every piece of text on the public pages. Changes are live on save. Reset
          puts a block back to the built-in default.
        </p>
      </div>

      {CONTENT_GROUPS.map((group) => {
        const groupKeys = keys.filter((k) => k.startsWith(`${group.prefix}.`));

        return (
          <section key={group.prefix} className="space-y-4">
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              {group.label}
            </h2>

            <div className="space-y-3">
              {groupKeys.map((key) => {
                const override = overrides.get(key);
                const value = override?.value ?? CONTENT_DEFAULTS[key];
                const long = value.length > 90 || value.includes("\n");

                return (
                  <form
                    key={key}
                    action={saveContent}
                    className={`rounded-xl border bg-ink-800 p-4 ${override ? "border-hot-500/40" : "border-ink-700"}`}
                  >
                    <input type="hidden" name="key" value={key} />

                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <label htmlFor={key} className="font-mono text-xs text-chalk-dim">
                        {key.slice(group.prefix.length + 1)}
                      </label>
                      {override ? (
                        <span className="text-xs text-hot-400">
                          edited {new Date(override.updated_at).toLocaleDateString("en-GB")}
                        </span>
                      ) : (
                        <span className="text-xs text-chalk-faint">default</span>
                      )}
                    </div>

                    {long ? (
                      <textarea
                        id={key}
                        name="value"
                        defaultValue={value}
                        rows={Math.min(10, Math.max(3, Math.ceil(value.length / 80)))}
                        className="mt-2 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk focus:border-hot-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        id={key}
                        name="value"
                        defaultValue={value}
                        className="mt-2 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk focus:border-hot-500 focus:outline-none"
                      />
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button type="submit" className="px-4 py-1.5 text-xs">
                        Save
                      </Button>
                      {override ? (
                        <Button
                          type="submit"
                          formAction={resetContent}
                          variant="ghost"
                          className="px-3 py-1.5 text-xs"
                        >
                          Reset to default
                        </Button>
                      ) : null}
                    </div>
                  </form>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
