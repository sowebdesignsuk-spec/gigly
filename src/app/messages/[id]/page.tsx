import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { formatGigDate } from "@/lib/utils/format";
import { Thread } from "./thread";

export const metadata: Metadata = { title: "Conversation" };

type Params = { params: Promise<{ id: string }> };

/** A conversation — Section 5, Week 6.1, 6.2, 6.5. */
export default async function ConversationPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/${id}`);

  const [{ data: profile }, { data: conversation }] = await Promise.all([
    supabase.from("profiles").select("full_name, account_type").eq("id", user.id).single(),
    supabase
      .from("conversations")
      .select("id, participant_1, participant_2, gig_id, booking_id, gigs(id, title, date)")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!profile) redirect("/");
  if (!conversation) notFound();

  const otherId =
    conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1;

  const [{ data: other }, { data: messages }] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, full_name, account_type")
      .eq("id", otherId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at, read_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);

  // Opening the thread reads it — Week 6.5.
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversation.id });

  // Where the other party's public page lives depends on their role.
  const [{ data: otherEntertainer }, { data: otherVenue }] = await Promise.all([
    supabase.from("entertainer_profiles").select("id").eq("user_id", otherId).maybeSingle(),
    supabase.from("venue_profiles").select("id").eq("user_id", otherId).maybeSingle(),
  ]);
  const otherHref = otherEntertainer
    ? `/entertainers/${otherEntertainer.id}`
    : otherVenue
      ? `/venues/${otherVenue.id}`
      : null;

  const bookingHref = conversation.booking_id
    ? `/${profile.account_type}/bookings/${conversation.booking_id}`
    : null;

  return (
    <>
      <AppHeader name={profile.full_name} accountType={profile.account_type} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-4">
          <div className="min-w-0">
            <Link href="/messages" className="text-xs text-chalk-dim hover:text-chalk">
              ← All messages
            </Link>
            <h1 className="mt-1 truncate text-xl font-bold">
              {otherHref ? (
                <Link href={otherHref} className="hover:text-hot-400">
                  {other?.full_name ?? "Deleted user"}
                </Link>
              ) : (
                (other?.full_name ?? "Deleted user")
              )}
            </h1>
          </div>

          {conversation.gigs ? (
            <Link
              href={bookingHref ?? `/gigs/${conversation.gigs.id}`}
              className="rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-xs text-chalk-dim hover:border-hot-500 hover:text-chalk"
            >
              {bookingHref ? "Booking" : "Gig"}: {conversation.gigs.title} ·{" "}
              {formatGigDate(conversation.gigs.date)}
            </Link>
          ) : null}
        </div>

        <Thread
          conversationId={conversation.id}
          currentUserId={user.id}
          initialMessages={messages ?? []}
          otherName={other?.full_name ?? "them"}
        />
      </main>
    </>
  );
}
