-- ============================================================================
-- GIGLY schema — part 5/6: reviews, notifications
-- Implements Sections 4.9, 4.10.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.9  reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings (id) on delete cascade,
  reviewer_id      uuid not null references public.profiles (id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles (id) on delete cascade,
  rating           integer not null,
  -- DEVIATION from 4.9: the plan names this column "text", which is also a type
  -- name and reads terribly in every query it appears in. Renamed to body, to
  -- match messages.body.
  body             text,
  is_visible       boolean not null default true,
  created_at       timestamptz not null default now(),

  constraint reviews_rating_range  check (rating between 1 and 5),
  constraint reviews_body_length   check (char_length(body) <= 500),
  constraint reviews_not_self      check (reviewer_id <> reviewed_user_id),
  -- Section 5 Week 8 gives both parties one review each per completed booking.
  constraint reviews_one_per_party unique (booking_id, reviewer_id)
);

create index reviews_reviewed_idx on public.reviews (reviewed_user_id)
  where is_visible;

-- The plan requires a completed booking before a review exists. Enforced here
-- rather than in RLS, because RLS is about who may write, not about whether the
-- booking has actually happened yet.
create or replace function public.enforce_review_preconditions()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  b record;
begin
  select * into b from public.bookings where id = new.booking_id;

  if b.status <> 'completed' then
    raise exception 'Cannot review booking % — status is %, expected completed',
      new.booking_id, b.status;
  end if;

  return new;
end;
$fn$;

create trigger reviews_check_preconditions
  before insert on public.reviews
  for each row execute function public.enforce_review_preconditions();

-- entertainer_profiles.average_rating, denormalised per Section 4.2.
create or replace function public.sync_entertainer_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  target uuid := coalesce(new.reviewed_user_id, old.reviewed_user_id);
begin
  update public.entertainer_profiles e
     set average_rating = (
       select round(avg(r.rating)::numeric, 2)
         from public.reviews r
        where r.reviewed_user_id = target
          and r.is_visible
     )
   where e.user_id = target;
  return null;
end;
$fn$;

create trigger reviews_sync_rating
  after insert or update of rating, is_visible or delete on public.reviews
  for each row execute function public.sync_entertainer_rating();

-- ---------------------------------------------------------------------------
-- 4.10  notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text not null,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- The navigation badge asks "how many unread?" on every page load. A partial
-- index keeps that query proportional to unread count, not to all history.
create index notifications_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Week 7 delivers notifications in-app without a page refresh.
alter publication supabase_realtime add table public.notifications;
