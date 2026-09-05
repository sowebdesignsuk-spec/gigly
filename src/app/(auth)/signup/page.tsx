import Link from "next/link";
import type { Metadata } from "next";

import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

const CHOICES = [
  {
    type: "entertainer",
    heading: "I'm an entertainer",
    blurb: "Singer, band, DJ, comedian, tribute act, dancer — find gigs and fill your diary.",
  },
  {
    type: "venue",
    heading: "I'm a venue",
    blurb: "Pub, club, hotel, holiday park, event company — post gigs and book acts.",
  },
] as const;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const choice = CHOICES.find((c) => c.type === type);

  // Section 5, Week 1.5 — account type selection, shown before the form. Split
  // across two steps rather than a dropdown because account_type is immutable
  // (Section 4.1): it deserves a deliberate choice, not a default someone
  // scrolls past.
  if (!choice) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Join GIGLY</h1>
          <p className="text-sm text-chalk-dim">First up — which are you?</p>
        </div>

        <div className="space-y-3">
          {CHOICES.map((c) => (
            <Link
              key={c.type}
              href={`/signup?type=${c.type}`}
              className="block rounded-xl border border-ink-600 bg-ink-800 p-5 transition-colors hover:border-hot-500"
            >
              <span className="block font-semibold text-chalk">{c.heading}</span>
              <span className="mt-1 block text-sm text-chalk-dim">{c.blurb}</span>
            </Link>
          ))}
        </div>

        <p className="text-sm text-chalk-faint">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-hot-500 hover:text-hot-400">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{choice.heading}</h1>
        <p className="text-sm text-chalk-dim">
          {choice.blurb}{" "}
          <Link href="/signup" className="text-hot-500 hover:text-hot-400">
            Not you?
          </Link>
        </p>
      </div>

      <SignUpForm accountType={choice.type} />

      <p className="text-sm text-chalk-faint">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-hot-500 hover:text-hot-400">
          Log in
        </Link>
      </p>
    </div>
  );
}
