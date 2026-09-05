-- ============================================================================
-- GIGLY schema — part 3/6: gigs, applications, bookings
-- Implements Sections 4.4, 4.5, 4.6 — the core marketplace loop.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.4  gigs
-- ---------------------------------------------------------------------------
create table public.gigs (
  id                uuid primary key default gen_random_uuid(),
  venue_id          uuid not null references public.venue_profiles (id) on delete cascade,
  title             text not null,
  category          text not null,
  description       text not null,
  date              date not null,
  start_time        time not null,
  end_time          time,
  location_text     text not null,
  location_lat      numeric(9, 6),
  location_lng      numeric(9, 6),
  -- Budget in pence. budget_max null means an exact fee, not "no maximum" —
  -- Section 1.2 is explicit that a blank fee kills application rates, so
  -- budget_min is required.
  budget_min        integer not null,
  budget_max        integer,
  audience_size     text,
  requirements      text,
  inclusions        text,
  is_urgent         boolean not null default false,
  is_featured       boolean not null default false,
  visibility        public.gig_visibility not null default 'draft',
  application_count integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint gigs_budget_positive check (budget_min >= 0),
  constraint gigs_budget_ordered  check (budget_max is null or budget_max >= budget_min),
  constraint gigs_lat_range       check (location_lat between -90  and 90),
  constraint gigs_lng_range       check (location_lng between -180 and 180)
);

-- Same reasoning as profiles.location: this is what the distance search hits.
alter table public.gigs
  add column location extensions.geography(Point, 4326)
  generated always as (
    case
      when location_lat is not null and location_lng is not null
      then extensions.st_setsrid(
             extensions.st_makepoint(location_lng::double precision,
                                     location_lat::double precision),
             4326
           )::extensions.geography
    end
  ) stored;

create index gigs_location_idx on public.gigs using gist (location);
create index gigs_venue_idx    on public.gigs (venue_id);
create index gigs_category_idx on public.gigs (category);

-- The Week 3 browse page is always "published gigs, soonest first". A partial
-- index keeps drafts and closed listings out of the index entirely.
create index gigs_browse_idx on public.gigs (date, category)
  where visibility = 'published';

create trigger gigs_set_updated_at
  before update on public.gigs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4.5  applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id             uuid primary key default gen_random_uuid(),
  gig_id         uuid not null references public.gigs (id) on delete cascade,
  entertainer_id uuid not null references public.entertainer_profiles (id) on delete cascade,
  message        text,
  proposed_fee   integer,
  status         public.application_status not null default 'sent',
  viewed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- DEVIATION from 4.5: Section 5 Week 4.2 prevents duplicate applications in
  -- application code. A double-clicked Apply button beats application code; it
  -- does not beat a unique index.
  constraint applications_one_per_gig unique (gig_id, entertainer_id),

  constraint applications_fee_positive check (proposed_fee >= 0)
);

create index applications_gig_idx         on public.applications (gig_id);
create index applications_entertainer_idx on public.applications (entertainer_id);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- gigs.application_count is denormalised per Section 4.4. Maintained here so
-- the count is transactional with the application itself.
create or replace function public.sync_gig_application_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'INSERT' then
    update public.gigs set application_count = application_count + 1
      where id = new.gig_id;
  elsif tg_op = 'DELETE' then
    update public.gigs set application_count = greatest(application_count - 1, 0)
      where id = old.gig_id;
  end if;
  return null;
end;
$fn$;

create trigger applications_sync_count
  after insert or delete on public.applications
  for each row execute function public.sync_gig_application_count();

-- ---------------------------------------------------------------------------
-- 4.6  bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  gig_id              uuid not null references public.gigs (id) on delete restrict,
  application_id      uuid not null unique
                        references public.applications (id) on delete restrict,
  venue_id            uuid not null references public.venue_profiles (id) on delete restrict,
  entertainer_id      uuid not null references public.entertainer_profiles (id) on delete restrict,
  agreed_fee          integer not null,
  status              public.booking_status not null default 'confirmed',
  venue_notes         text,
  entertainer_notes   text,
  cancellation_reason text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint bookings_fee_positive check (agreed_fee >= 0),
  -- A cancelled booking without a reason is unusable in the Week 5 cancellation
  -- flow and in any later dispute.
  constraint bookings_cancellation_reason check (
    status not in ('cancelled_by_venue', 'cancelled_by_entertainer')
    or cancellation_reason is not null
  )
);

-- on delete restrict, not cascade: a booking is the financial record of the
-- transaction. Deleting a gig must not silently erase it.

create index bookings_venue_idx       on public.bookings (venue_id);
create index bookings_entertainer_idx on public.bookings (entertainer_id);
create index bookings_gig_idx         on public.bookings (gig_id);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- entertainer_profiles.total_bookings, denormalised per Section 4.2.
create or replace function public.sync_entertainer_booking_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.entertainer_profiles e
     set total_bookings = (
       select count(*) from public.bookings b
        where b.entertainer_id = e.id
          and b.status in ('confirmed', 'completed')
     )
   where e.id = coalesce(new.entertainer_id, old.entertainer_id);
  return null;
end;
$fn$;

create trigger bookings_sync_entertainer_count
  after insert or update of status or delete on public.bookings
  for each row execute function public.sync_entertainer_booking_count();

-- venue_profiles.total_gigs_posted, denormalised per Section 4.3.
create or replace function public.sync_venue_gig_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.venue_profiles v
     set total_gigs_posted = (
       select count(*) from public.gigs g
        where g.venue_id = v.id and g.visibility <> 'draft'
     )
   where v.id = coalesce(new.venue_id, old.venue_id);
  return null;
end;
$fn$;

create trigger gigs_sync_venue_count
  after insert or update of visibility or delete on public.gigs
  for each row execute function public.sync_venue_gig_count();
