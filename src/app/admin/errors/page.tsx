import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { secretStatus } from "@/lib/settings/load";

export const metadata: Metadata = { title: "Errors · Admin" };

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
 * Errors caught by the app's error boundary.
 *
 * Not a replacement for Sentry — no stack traces, no release tracking, no
 * alerting. It is the floor: until a DSN exists, errors would otherwise vanish
 * into Vercel's function logs where nobody looks. When Sentry arrives this
 * stays as the thing an admin can check without another login.
 */
export default async function AdminErrorsPage() {
  const supabase = await createClient();

  const { data: errors } = await supabase
    .from("error_log")
    .select("id, digest, message, path, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = errors ?? [];
  const sentryConfigured = secretStatus("NEXT_PUBLIC_SENTRY_DSN");

  // Same digest = same underlying fault, however many times it fired.
  const distinct = new Set(rows.map((e) => e.digest ?? e.message)).size;
  const lastDay = rows.filter(
    (e) => new Date(e.created_at).getTime() > Date.now() - 86_400_000,
  ).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Errors</h1>
        <p className="max-w-2xl text-sm text-chalk-dim">
          Anything that broke a page for a real person. Kept for 30 days.
          {sentryConfigured
            ? " Sentry is configured too, and has the stack traces."
            : " Add a Sentry DSN for stack traces and alerting — this page has neither."}
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-2xl font-bold text-chalk tabular-nums">{lastDay}</p>
            <p className="text-xs tracking-wide text-chalk-faint uppercase">in the last 24 hours</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-chalk tabular-nums">{distinct}</p>
            <p className="text-xs tracking-wide text-chalk-faint uppercase">distinct faults</p>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-go/40 bg-go/10 p-6">
          <p className="font-semibold text-chalk">Nothing has broken</p>
          <p className="mt-1 text-sm text-chalk-dim">
            No errors recorded. That is either very good news or very early days.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((e) => (
            <li key={e.id} className="rounded-xl border border-ink-700 bg-ink-800 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="text-sm text-stop">{e.message}</code>
                <span className="text-xs text-chalk-faint tabular-nums">{when(e.created_at)}</span>
              </div>
              <p className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-chalk-faint">
                {e.path ? <span>{e.path}</span> : null}
                {e.digest ? <span>ref {e.digest}</span> : null}
                {e.user_agent ? <span className="truncate">{e.user_agent.slice(0, 60)}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
