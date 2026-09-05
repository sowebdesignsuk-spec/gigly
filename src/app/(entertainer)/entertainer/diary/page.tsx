import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { DiaryGrid, type DiaryDay } from "./diary-grid";

export const metadata: Metadata = { title: "Diary" };

type Search = Promise<{ month?: string }>;

/** "2026-09" → first and last ISO dates of that month, plus a label. */
function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    from: iso(first),
    to: iso(last),
    daysInMonth: last.getUTCDate(),
    // 0 = Monday, matching a UK calendar.
    startOffset: (first.getUTCDay() + 6) % 7,
    label: first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    prev: iso(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7),
    next: iso(new Date(Date.UTC(y, m, 1))).slice(0, 7),
  };
}

/**
 * Diary — Section 5, Week 5.5 and 5.6.
 * Month view: available = green, held = amber, booked = pink, unavailable = grey.
 */
export default async function DiaryPage({ searchParams }: { searchParams: Search }) {
  const { month: rawMonth } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const month = /^\d{4}-\d{2}$/.test(rawMonth ?? "")
    ? rawMonth!
    : new Date().toISOString().slice(0, 7);
  const bounds = monthBounds(month);

  const [{ data: profile }, { data: entertainer }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("entertainer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const [{ data: slots }, { data: bookings }] = entertainer
    ? await Promise.all([
        supabase
          .from("availability")
          .select("date, time_slot, status, notes, booking_id")
          .eq("entertainer_id", entertainer.id)
          .gte("date", bounds.from)
          .lte("date", bounds.to),
        supabase
          .from("bookings")
          .select("id, status, gigs(date, title), venue_profiles(venue_name)")
          .eq("entertainer_id", entertainer.id)
          .eq("status", "confirmed"),
      ])
    : [{ data: [] }, { data: [] }];

  const byDate = new Map<string, DiaryDay>();
  for (const s of slots ?? []) {
    const day = byDate.get(s.date) ?? { date: s.date, slots: [] };
    day.slots.push({ time_slot: s.time_slot, status: s.status, notes: s.notes });
    byDate.set(s.date, day);
  }
  for (const b of bookings ?? []) {
    if (!b.gigs || b.gigs.date < bounds.from || b.gigs.date > bounds.to) continue;
    const day = byDate.get(b.gigs.date) ?? { date: b.gigs.date, slots: [] };
    day.booking = { id: b.id, title: b.gigs.title, venue: b.venue_profiles?.venue_name ?? "" };
    byDate.set(b.gigs.date, day);
  }

  return (
    <>
      <AppHeader name={profile?.full_name ?? ""} accountType="entertainer" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Diary</h1>
            <p className="text-sm text-chalk-dim">
              Tap a day to mark it. Venues see which dates you&apos;re free.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/entertainer/diary?month=${bounds.prev}`}
              className="rounded-lg bg-ink-700 px-3 py-2 text-sm text-chalk hover:bg-ink-600"
              aria-label="Previous month"
            >
              ←
            </Link>
            <span className="min-w-36 text-center text-sm font-semibold text-chalk">
              {bounds.label}
            </span>
            <Link
              href={`/entertainer/diary?month=${bounds.next}`}
              className="rounded-lg bg-ink-700 px-3 py-2 text-sm text-chalk hover:bg-ink-600"
              aria-label="Next month"
            >
              →
            </Link>
          </div>
        </div>

        {!entertainer ? (
          <div className="mt-8 rounded-xl border border-hot-500/40 bg-hot-500/10 p-5">
            <p className="font-semibold text-chalk">Set up your profile first</p>
            <Link href="/entertainer/profile" className="mt-2 inline-block text-sm text-hot-500">
              Go to profile →
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <DiaryGrid
              month={month}
              daysInMonth={bounds.daysInMonth}
              startOffset={bounds.startOffset}
              days={[...byDate.values()]}
              today={new Date().toISOString().slice(0, 10)}
            />
          </div>
        )}

        <ul className="mt-6 flex flex-wrap gap-4 text-xs text-chalk-dim">
          <li><span className="mr-1.5 inline-block size-2.5 rounded-full bg-go" />Available</li>
          <li><span className="mr-1.5 inline-block size-2.5 rounded-full bg-hold" />Held</li>
          <li><span className="mr-1.5 inline-block size-2.5 rounded-full bg-hot-500" />Booked</li>
          <li><span className="mr-1.5 inline-block size-2.5 rounded-full bg-ink-600" />Unavailable</li>
        </ul>
      </main>
    </>
  );
}
