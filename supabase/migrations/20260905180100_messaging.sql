-- ============================================================================
-- Week 6 — messaging
-- Section 5, Week 6.3 (linked conversations), 6.5 (read receipts),
-- 6.6 (unread badge), 6.7 (message notifications).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- get_or_create_conversation — Week 6.3, 6.4
--
-- One thread per pair per gig. The unique index on conversations enforces it;
-- this function is the single way to obtain a thread so callers never race
-- each other into a duplicate-key error. Runs as INVOKER: the conversations
-- RLS insert policy (caller must be a participant) still applies.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_conversation(
  p_other_user uuid,
  p_gig_id     uuid default null,
  p_booking_id uuid default null
)
returns uuid
language plpgsql
as $fn$
declare
  me  uuid := auth.uid();
  a   uuid;
  b   uuid;
  cid uuid;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_other_user = me then
    raise exception 'cannot message yourself';
  end if;

  a := least(me, p_other_user);
  b := greatest(me, p_other_user);

  select id into cid
    from public.conversations
   where participant_1 = a and participant_2 = b
     and gig_id is not distinct from p_gig_id;

  if cid is null then
    insert into public.conversations (participant_1, participant_2, gig_id, booking_id)
    values (a, b, p_gig_id, p_booking_id)
    returning id into cid;
  elsif p_booking_id is not null then
    -- A thread that started on a gig picks up the booking once there is one.
    update public.conversations set booking_id = p_booking_id
     where id = cid and booking_id is null;
  end if;

  return cid;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- mark_conversation_read — Week 6.5
-- ---------------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
as $fn$
  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read_at is null;
$fn$;

-- ---------------------------------------------------------------------------
-- unread_message_count — Week 6.6
-- ---------------------------------------------------------------------------
create or replace function public.unread_message_count()
returns integer
language sql
stable
as $fn$
  select count(*)::integer
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
   where m.read_at is null
     and m.sender_id <> auth.uid()
     and auth.uid() in (c.participant_1, c.participant_2);
$fn$;

-- ---------------------------------------------------------------------------
-- Message notifications — Week 6.7
--
-- Throttled: if the recipient already has an unread notification for this
-- thread, another is not added. A live chat would otherwise produce one
-- notification per line, and the first unread one already says "you have
-- messages from X".
-- ---------------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c         record;
  recipient uuid;
  sender    text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  recipient := case when c.participant_1 = new.sender_id then c.participant_2 else c.participant_1 end;

  if exists (
    select 1 from public.notifications
     where user_id = recipient
       and type = 'message'
       and link = '/messages/' || new.conversation_id
       and read_at is null
  ) then
    return null;
  end if;

  select full_name into sender from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    recipient,
    'message',
    'New message from ' || coalesce(sender, 'someone'),
    left(new.body, 120) || case when length(new.body) > 120 then '…' else '' end,
    '/messages/' || new.conversation_id
  );

  return null;
end;
$fn$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

grant execute on function public.get_or_create_conversation to authenticated;
grant execute on function public.mark_conversation_read     to authenticated;
grant execute on function public.unread_message_count       to authenticated;
