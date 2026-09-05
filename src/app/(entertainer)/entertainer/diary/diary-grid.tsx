"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { setAvailability } from "@/lib/bookings/actions";

export type DiaryDay = {
  date: string;
  slots: { time_slot: string; status: string; notes: string | null }[];
  booking?: { id: string; title: string; venue: string };
};

const DOT: Record<string, string> = {
  available: "bg-go",
  held: "bg-hold",
  booked: "bg-hot-500",
  unavailable: "bg-ink-600",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The month grid plus a per-day editor. Section 5, Week 5.5–5.6. */
export function DiaryGrid({
  month,
  daysInMonth,
  startOffset,
  days,
  today,
}: {
  month: string;
  daysInMonth: number;
  startOffset: number;
  days: DiaryDay[];
  today: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const byDate = new Map(days.map((d) => [d.date, d]));

  const cells: (string | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const day = selected ? byDate.get(selected) : undefined;
  const allDay = day?.slots.find((s) => s.time_slot === "all_day");
  const isBooked = Boolean(day?.booking) || day?.slots.some((s) => s.status === "booked");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-chalk-faint">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) =>
          date ? (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              aria-pressed={selected === date}
              className={`flex aspect-square flex-col items-center justify-between rounded-lg border p-1.5 text-sm transition-colors ${
                selected === date
                  ? "border-hot-500 bg-ink-700"
                  : "border-ink-700 bg-ink-800 hover:border-ink-600"
              } ${date < today ? "opacity-50" : ""}`}
            >
              <span className={date === today ? "font-bold text-hot-400" : "text-chalk"}>
                {Number(date.slice(-2))}
              </span>
              <span className="flex gap-0.5">
                {byDate.get(date)?.booking ? (
                  <span className={`size-2 rounded-full ${DOT.booked}`} />
                ) : (
                  byDate
                    .get(date)
                    ?.slots.slice(0, 3)
                    .map((s) => (
                      <span key={s.time_slot} className={`size-2 rounded-full ${DOT[s.status] ?? ""}`} />
                    ))
                )}
              </span>
            </button>
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>

      {selected ? (
        <div className="rounded-xl border border-ink-700 bg-ink-800 p-5">
          <p className="text-sm font-semibold text-chalk">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </p>

          {day?.booking ? (
            <p className="mt-2 text-sm text-chalk-dim">
              Booked:{" "}
              <Link href={`/entertainer/bookings/${day.booking.id}`} className="text-hot-500 hover:text-hot-400">
                {day.booking.title}
              </Link>{" "}
              at {day.booking.venue}. Cancel from the booking page if you need to.
            </p>
          ) : isBooked ? (
            <p className="mt-2 text-sm text-chalk-dim">Booked.</p>
          ) : (
            <form action={setAvailability} className="mt-4 space-y-3">
              <input type="hidden" name="date" value={selected} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="time_slot" value="all_day" />

              <div className="flex flex-wrap gap-2">
                {[
                  ["available", "Available"],
                  ["held", "Held"],
                  ["unavailable", "Unavailable"],
                  ["clear", "Clear"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="submit"
                    name="status"
                    value={value}
                    variant={allDay?.status === value ? "primary" : "secondary"}
                    className="px-4 py-2 text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <input
                name="notes"
                defaultValue={allDay?.notes ?? ""}
                placeholder="Private note, e.g. pencilled for a wedding"
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none"
              />
              <p className="text-xs text-chalk-faint">
                Held means you&apos;ve pencilled something in but it isn&apos;t confirmed.
              </p>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
