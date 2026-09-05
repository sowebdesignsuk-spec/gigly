"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Section 5, Week 6.1 — send a message into a thread the caller is in. */
export async function sendMessage(formData: FormData) {
  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !body) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS: the insert policy requires sender_id = auth.uid() AND membership of
  // the conversation, so a forged conversation_id inserts nothing.
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: body.slice(0, 4000),
  });

  revalidatePath("/messages");
}
