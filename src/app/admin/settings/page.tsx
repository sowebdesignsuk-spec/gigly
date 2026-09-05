import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SECRETS, SETTING_GROUPS, type Setting } from "@/lib/settings/registry";
import { secretStatus } from "@/lib/settings/load";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings · Admin" };

const inputClass =
  "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none";

function Field({ setting, value }: { setting: Setting; value: string }) {
  const id = `s-${setting.key}`;

  if (setting.kind === "toggle") {
    return (
      <label htmlFor={id} className="flex items-start gap-3">
        <input
          id={id}
          name={setting.key}
          type="checkbox"
          value="true"
          defaultChecked={value === "true"}
          className="mt-1 size-4 shrink-0 accent-hot-500"
        />
        <span>
          <span className="block text-sm font-medium text-chalk">{setting.label}</span>
          {setting.help ? (
            <span className="mt-0.5 block text-xs text-chalk-faint">{setting.help}</span>
          ) : null}
        </span>
      </label>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-chalk">
        {setting.label}
      </label>

      {setting.kind === "textarea" ? (
        <textarea
          id={id}
          name={setting.key}
          rows={3}
          defaultValue={value}
          placeholder={setting.placeholder}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          name={setting.key}
          type={setting.kind === "email" ? "email" : setting.kind === "url" ? "url" : "text"}
          defaultValue={value}
          placeholder={setting.placeholder}
          className={inputClass}
        />
      )}

      {setting.help ? <p className="text-xs text-chalk-faint">{setting.help}</p> : null}
    </div>
  );
}

/**
 * Admin settings — SEO, analytics, social, marketplace switches, and a
 * read-only report on which API keys are configured.
 *
 * The keys themselves are not editable here on purpose. See the migration
 * comment: a credential in a public-readable table, reachable by anything with
 * an admin session and travelling in every database backup, is a worse place
 * than Vercel's encrypted environment. This page tells you which are missing
 * and exactly where to put them.
 */
export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const stored = new Map((data ?? []).map((r) => [r.key, r.value]));

  const secrets = SECRETS.map((s) => ({ ...s, configured: secretStatus(s.envVar) }));
  const missingRequired = secrets.filter((s) => s.required && !s.configured);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="max-w-2xl text-sm text-chalk-dim">
          Everything here is live the moment you save. Values matching the built-in default
          aren&apos;t stored, so clearing a field restores it.
        </p>
      </div>

      {/* ------------------------------------------------------- API keys --- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
            API keys
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-chalk-dim">
            Keys live in Vercel&apos;s environment variables, not in this database — a
            credential in a table is readable by anything with an admin session and travels
            in every backup. This is a read-only report of what&apos;s configured.
          </p>
        </div>

        {missingRequired.length > 0 ? (
          <p role="alert" className="rounded-xl border border-stop/40 bg-stop/10 px-4 py-3 text-sm text-stop">
            {missingRequired.map((s) => s.envVar).join(", ")} missing — the app cannot work
            without it.
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-ink-700">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-ink-800 text-left text-xs tracking-wide text-chalk-faint uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Key</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">What it unlocks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {secrets.map((s) => (
                <tr key={s.envVar} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-chalk">{s.label}</p>
                    <code className="mt-0.5 block text-xs text-chalk-faint">{s.envVar}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        s.configured
                          ? "bg-go/15 text-go"
                          : s.required
                            ? "bg-stop/15 text-stop"
                            : "bg-ink-700 text-chalk-faint"
                      }`}
                    >
                      {s.configured ? "Set" : s.required ? "Missing" : "Not set"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-chalk-dim">
                    <p>{s.unlocks}</p>
                    {!s.configured ? (
                      <p className="mt-1 text-xs text-chalk-faint">Get it from {s.where}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="rounded-xl border border-ink-700 bg-ink-800 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-chalk">
            How to add one
          </summary>
          <ol className="mt-3 space-y-2 text-sm text-chalk-dim">
            <li>1. Vercel → the <code className="text-chalk">gigly</code> project → Settings → Environment Variables.</li>
            <li>2. Add the name exactly as written above, paste the value, tick all three environments.</li>
            <li>3. Deployments → the latest one → ⋯ → Redeploy. Environment variables are baked in at build time, so an existing deployment won&apos;t pick it up.</li>
            <li>4. Come back here — the status flips to Set.</li>
          </ol>
        </details>
      </section>

      {/* ------------------------------------------------------- settings --- */}
      {SETTING_GROUPS.map((group) => (
        <section key={group.id} className="space-y-4">
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-chalk-faint uppercase">
              {group.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-chalk-dim">{group.blurb}</p>
          </div>

          <form action={saveSettings} className="space-y-5 rounded-xl border border-ink-700 bg-ink-800 p-6">
            {group.settings.map((s) => (
              <input key={`k-${s.key}`} type="hidden" name="__keys" value={s.key} />
            ))}

            {group.settings.map((s) => (
              <Field key={s.key} setting={s} value={stored.get(s.key) ?? s.default} />
            ))}

            <Button type="submit" className="px-5 py-2.5 text-sm">
              Save {group.title.toLowerCase()}
            </Button>
          </form>
        </section>
      ))}
    </div>
  );
}
