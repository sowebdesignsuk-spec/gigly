"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/messages/actions";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function Send() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="px-5 py-3 text-sm">
      {pending ? "…" : "Send"}
    </Button>
  );
}

function stamp(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * The live part of a conversation — Section 5, Week 6.2.
 *
 * Subscribes to INSERTs on messages for this thread. Supabase Realtime applies
 * the messages RLS policy to the subscription, so a user who is not a
 * participant receives nothing even if they know the id. Own messages arrive
 * through the same channel, which keeps ordering identical on both sides.
 */
export function Thread({
  conversationId,
  currentUserId,
  initialMessages,
  otherName,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  otherName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((current) =>
            current.some((m) => m.id === incoming.id) ? current : [...current, incoming],
          );
          // Reading it live counts as reading it.
          if (incoming.sender_id !== currentUserId) {
            void supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-chalk-faint">
            Say hello to {otherName}. Keep it about the gig — that&apos;s what this is for.
          </p>
        ) : null}

        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  mine ? "rounded-br-md bg-hot-500 text-white" : "rounded-bl-md bg-ink-700 text-chalk"
                }`}
              >
                {m.body}
                <span className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-chalk-faint"}`}>
                  {stamp(m.created_at)}
                  {mine && m.read_at ? " · read" : ""}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await sendMessage(formData);
          formRef.current?.reset();
        }}
        className="flex items-end gap-3 border-t border-ink-700 pt-4"
      >
        <input type="hidden" name="conversation_id" value={conversationId} />
        <textarea
          name="body"
          required
          rows={2}
          maxLength={4000}
          placeholder={`Message ${otherName}…`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="flex-1 resize-none rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none"
        />
        <Send />
      </form>
    </>
  );
}
