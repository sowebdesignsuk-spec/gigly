import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Activity · Admin" };

const ACTION_STYLE: Record<string, string> = {
  "user.suspended": "bg-hold/15 text-hold",
  "user.active": "bg-go/15 text-go",
  "user.erased": "bg-stop/15 text-stop",
  "gig.cancelled": "bg-stop/15 text-stop",
  "gig.published": "bg-go/15 text-go",
  "gig.closed": "bg-ink-700 text-chalk-dim",
};

const ACTION_LABEL: Record<string, string> = {
  "user.suspended": "Suspended a user",
  "user.active": "Reinstated a user",
  "user.erased": "Erased a user",
  "gig.cancelled": "Took down a gig",
  "gig.published": "Restored a gig",
  "gig.closed": "Closed a gig",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

/**
 * Admin activity log.
 *
 * Under UK GDPR accountability, being able to erase an account is only half of
 * it — you also have to be able to show who did it and when. This is that
 * record. It is read-only for everyone, including admins: there is no policy
 * that permits writing to it from a client, only the SECURITY DEFINER function
 * the admin actions call.
 */
export default async function AdminActivityPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("admin_audit")
    .select("id, actor_email, action, subject, subject_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = entries ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="max-w-2xl text-sm text-chalk-dim">
          Every moderation action, who took it, and when. Append-only — nobody can edit or
          delete an entry, including you. That is what makes it worth having.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-ink-700 bg-ink-800 p-6">
          <p className="font-semibold text-chalk">Nothing logged yet</p>
          <p className="mt-1 text-sm text-chalk-dim">
            Suspending a user, erasing an account or taking down a gig will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-700 rounded-xl border border-ink-700 bg-ink-800">
          {rows.map((e) => {
            const detail = (e.detail ?? {}) as Record<string, unknown>;
            const mode = typeof detail.mode === "string" ? detail.mode : null;

            return (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_STYLE[e.action] ?? "bg-ink-700 text-chalk-dim"}`}
                >
                  {ACTION_LABEL[e.action] ?? e.action}
                </span>

                <span className="min-w-0 flex-1 text-sm text-chalk">
                  {e.subject ?? <span className="text-chalk-faint">(no subject)</span>}
                  {mode ? (
                    <span className="ml-2 text-xs text-chalk-faint">
                      {mode === "hard_delete" ? "deleted outright" : "anonymised, bookings kept"}
                    </span>
                  ) : null}
                </span>

                <span className="text-xs text-chalk-dim">{e.actor_email ?? "unknown admin"}</span>
                <span className="text-xs text-chalk-faint tabular-nums">{when(e.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
