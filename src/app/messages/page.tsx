import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

function relative(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Inbox — Section 5, Week 6.1, sorted by most recent. */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, account_type")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/");

  // RLS limits this to threads the user is in.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, last_message_at, gigs(title)")
    .order("last_message_at", { ascending: false })
    .limit(100);

  const rows = conversations ?? [];
  const otherIds = rows.map((c) => (c.participant_1 === user.id ? c.participant_2 : c.participant_1));

  const [{ data: people }, { data: latest }] = await Promise.all([
    otherIds.length
      ? supabase.from("public_profiles").select("id, full_name, account_type").in("id", otherIds)
      : Promise.resolve({ data: [] }),
    rows.length
      ? supabase
          .from("messages")
          .select("conversation_id, body, sender_id, read_at, created_at")
          .in("conversation_id", rows.map((c) => c.id))
          .order("created_at", { ascending: false })
          .limit(400)
      : Promise.resolve({ data: [] }),
  ]);

  const nameOf = new Map((people ?? []).map((p) => [p.id, p]));

  // First message per conversation is the latest; count unread from others.
  const preview = new Map<string, { body: string; at: string; unread: number }>();
  for (const m of latest ?? []) {
    const p = preview.get(m.conversation_id);
    const unreadHere = m.sender_id !== user.id && !m.read_at ? 1 : 0;
    if (!p) preview.set(m.conversation_id, { body: m.body, at: m.created_at, unread: unreadHere });
    else p.unread += unreadHere;
  }

  return (
    <>
      <AppHeader name={profile.full_name} accountType={profile.account_type} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-sm text-chalk-dim">
            Every thread stays attached to the gig or booking it&apos;s about.
          </p>
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-xl border border-stop/40 bg-stop/10 px-4 py-3 text-sm text-stop">
            Couldn&apos;t start that conversation.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-ink-700 bg-ink-800 p-6">
            <p className="font-semibold text-chalk">No conversations yet</p>
            <p className="mt-1 text-sm text-chalk-dim">
              {profile.account_type === "venue"
                ? "Message an act from their profile or from an application."
                : "Venues will message you about applications. You can also message a venue from any gig or booking."}
            </p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-ink-700 rounded-xl border border-ink-700 bg-ink-800">
            {rows.map((c) => {
              const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
              const other = nameOf.get(otherId);
              const p = preview.get(c.id);

              return (
                <li key={c.id}>
                  <Link href={`/messages/${c.id}`} className="flex gap-4 px-5 py-4 hover:bg-ink-700">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`truncate ${p?.unread ? "font-semibold text-chalk" : "text-chalk"}`}>
                          {other?.full_name ?? "Deleted user"}
                          {c.gigs?.title ? (
                            <span className="ml-2 text-xs font-normal text-chalk-faint">
                              · {c.gigs.title}
                            </span>
                          ) : null}
                        </p>
                        <span className="shrink-0 text-xs text-chalk-faint">
                          {relative(p?.at ?? c.last_message_at)}
                        </span>
                      </div>
                      <p className={`mt-0.5 truncate text-sm ${p?.unread ? "text-chalk-dim" : "text-chalk-faint"}`}>
                        {p?.body ?? "No messages yet"}
                      </p>
                    </div>
                    {p?.unread ? (
                      <span className="self-center rounded-full bg-hot-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {p.unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
