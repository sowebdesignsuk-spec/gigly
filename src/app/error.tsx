"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Route-level error boundary — Section 5, Week 9.7.
 *
 * Catches a render or data error in any page and shows something a person can
 * act on instead of a blank screen, then records it so an admin can see it at
 * /admin/errors. record_error is rate-limited per digest in the database, so a
 * broken page hit by a crawler cannot flood the table.
 *
 * The `digest` is Next's server-side error id — the same value appears in the
 * Vercel logs, which is how a report here gets matched to a stack trace there.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);

    // Best-effort. An error while reporting an error must not surface a second
    // error page to the user.
    void createClient()
      .rpc("record_error", {
        p_message: error.message || "Unknown error",
        p_digest: error.digest ?? undefined,
        p_path: window.location.pathname,
        p_user_agent: navigator.userAgent,
      })
      .then(undefined, () => {});
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-chalk-dim">
        That page didn&apos;t load. It&apos;s been logged; trying again usually works.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-chalk-faint">ref {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Go home
        </Button>
      </div>
    </main>
  );
}
