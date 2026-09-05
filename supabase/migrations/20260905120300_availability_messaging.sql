-- ============================================================================
-- GIGLY schema — part 4/6: availability, conversations, messages
-- Implements Sections 4.7, 4.8.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.7  availability
-- ---------------------------------------------------------------------------
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  entertainer_id uuid not null references public.entertainer_profiles (id) on delete cascade,
  date           date not null,
  time_slot      public.availability_slot  not null default 'all_day',
  status         public.availability_status not null,
  notes          text,
  booking_id     uuid references public.bookings (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- DEVIATION from 4.7: the plan has no uniqueness here. Without it the same
  -- slot can hold both 'available' and 'booked' rows and the Week 5 calendar
  -- has no way to decide which is true.
  constraint availability_one_per_slot unique (entertainer_id, date, time_slot),

  -- A slot marked booked must say which booking it belongs to, otherwise a
  -- cancellation cannot free the date back up.
  constraint availability_booked_has_booking check (
    status <> 'booked' or booking_id is not null
  )
);

create index availability_lookup_idx on public.availability (entertainer_id, date);

create trigger availability_set_updated_at
  before update on public.availability
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4.8  conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  gig_id          uuid references public.gigs (id)     on delete set null,
  booking_id      uuid references public.bookings (id) on delete set null,
  participant_1   uuid not null references public.profiles (id) on delete cascade,
  participant_2   uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  constraint conversations_distinct_participants check (participant_1 <> participant_2),
  -- Enforced by the normalise trigger below. Stated as a constraint so a bad
  -- direct insert fails loudly rather than creating an unreachable duplicate.
  constraint conversations_participants_ordered check (participant_1 < participant_2)
);

-- DEVIATION from 4.8: without this, (alice, bob) and (bob, alice) are two rows.
-- Each user opens "their" thread, neither sees the other's messages, and the
-- bug looks like messages being dropped. NULLS NOT DISTINCT means two direct
-- enquiries with no gig context also collapse to one thread.
create unique index conversations_unique_pair
  on public.conversations (participant_1, participant_2, gig_id)
  nulls not distinct;

create index conversations_p1_idx     on public.conversations (participant_1, last_message_at desc);
create index conversations_p2_idx     on public.conversations (participant_2, last_message_at desc);

-- Swaps the pair into a canonical order so callers never have to think about it.
create or replace function public.normalise_conversation_participants()
returns trigger
language plpgsql
as $fn$
declare
  swap uuid;
begin
  if new.participant_1 > new.participant_2 then
    swap              := new.participant_1;
    new.participant_1 := new.participant_2;
    new.participant_2 := swap;
  end if;
  return new;
end;
$fn$;

create trigger conversations_normalise_participants
  before insert or update of participant_1, participant_2 on public.conversations
  for each row execute function public.normalise_conversation_participants();

-- ---------------------------------------------------------------------------
-- 4.8  messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),

  constraint messages_body_not_blank check (char_length(btrim(body)) > 0)
);

create index messages_thread_idx on public.messages (conversation_id, created_at desc);

-- conversations.last_message_at drives the Week 6 conversation list ordering.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return null;
end;
$fn$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Week 6 requires realtime message delivery. Supabase only streams tables that
-- are members of this publication.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
