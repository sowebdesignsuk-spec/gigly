import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions";

export const metadata: Metadata = { title: "Alerts" };

const ICON: Record<string, string> = {
  gig_match: "◎",
  application_received: "✉",
  application_update: "↻",
  booking_confirmed: "✓",
  booking_cancelled: "✕",
  message: "…",
  review: "★",
  system: "•",
};

function when(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Notification centre — Section 5, Week 7.1. */
export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("full_name, account_type").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!profile) redirect("/");

  const rows = notifications ?? [];
  const unread = rows.filter((n) => !n.read_at).length;

  return (
    <>
      <AppHeader name={profile.full_name} accountType={profile.account_type} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Alerts</h1>
            <p className="text-sm text-chalk-dim">
              {unread > 0 ? `${unread} unread.` : "You're up to date."}
            </p>
          </div>
          {unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
                Mark all read
              </Button>
            </form>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">Nothing yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              Applications, offers, bookings and messages all land here.
            </p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-ink-700 rounded-xl border border-ink-700 bg-ink-800">
            {rows.map((n) => (
              <li key={n.id} className={`flex gap-4 px-5 py-4 ${n.read_at ? "" : "bg-hot-500/5"}`}>
                <span
                  aria-hidden
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm ${
                    n.read_at ? "bg-ink-700 text-chalk-faint" : "bg-hot-500/15 text-hot-400"
                  }`}
                >
                  {ICON[n.type] ?? "•"}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read_at ? "text-chalk-dim" : "font-semibold text-chalk"}`}>
                    {n.link ? (
                      <Link href={n.link} className="hover:text-hot-400">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-chalk-faint">{n.body}</p>
                  <p className="mt-1 text-xs text-chalk-faint">{when(n.created_at)}</p>
                </div>

                {!n.read_at ? (
                  <form action={markNotificationRead} className="self-center">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="text-xs text-chalk-faint hover:text-chalk"
                      aria-label="Mark as read"
                    >
                      Read
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
