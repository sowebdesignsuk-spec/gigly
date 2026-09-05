import { formatPence } from "@/lib/profile/constants";

/**
 * Date and time formatting.
 *
 * Everything is en-GB and Europe/London, fixed rather than taken from the
 * viewer's locale: a gig on the 3rd of April must not render as April 3rd for
 * one user and 3 April for another, and a server rendering in UTC must not show
 * a 00:30 finish as the previous day.
 */

const TZ = "Europe/London";

export function formatGigDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function formatGigDateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** "20:00:00" → "8pm", "20:30:00" → "8.30pm". */
export function formatTime(value: string | null): string | null {
  if (!value) return null;

  const [rawHours, rawMinutes] = value.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (!Number.isFinite(hours)) return null;

  const suffix = hours >= 12 ? "pm" : "am";
  const display = hours % 12 === 0 ? 12 : hours % 12;

  return minutes ? `${display}.${String(minutes).padStart(2, "0")}${suffix}` : `${display}${suffix}`;
}

/** "8pm – 11pm", or just "8pm" when there's no end time. */
export function formatTimeRange(start: string, end: string | null): string {
  const from = formatTime(start);
  const to = formatTime(end);
  return to ? `${from} – ${to}` : (from ?? "");
}

/** "£300" for an exact fee, "£300 – £450" for a range. */
export function formatFee(min: number, max: number | null): string {
  return max && max !== min ? `${formatPence(min)} – ${formatPence(max)}` : formatPence(min);
}

/** "2 miles away", "18 miles away". Sub-mile distances read oddly as "0 miles". */
export function formatDistance(miles: number | null | undefined): string | null {
  if (miles == null) return null;
  if (miles < 1) return "Under a mile away";
  return `${Math.round(miles)} mile${Math.round(miles) === 1 ? "" : "s"} away`;
}

/** "in 3 days", "tomorrow", "today". */
export function daysUntil(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${iso}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  return `In ${Math.round(days / 7)} weeks`;
}

/**
 * "1 booking", "2 bookings". English pluralisation is regular often enough
 * that a helper beats remembering the ternary at each call site — and
 * forgetting it produces "1 bookings", which reads as carelessness about
 * everything else on the page.
 */
export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}
