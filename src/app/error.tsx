"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary — Section 5, Week 9.7.
 *
 * Catches a render or data error in any page and shows something a person can
 * act on instead of a blank screen. The `digest` is Next's server-side error
 * id, which is what to search for in the Vercel logs.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry (or whichever monitor is chosen) hooks in here. Until one is
    // wired up, the console is where this lands.
    console.error(error);
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
