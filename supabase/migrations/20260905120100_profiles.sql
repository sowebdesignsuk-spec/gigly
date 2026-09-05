-- ============================================================================
-- GIGLY schema — part 2/6: profiles, entertainer profiles, venue profiles
-- Implements Sections 4.1, 4.2, 4.3.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.1  profiles — extends auth.users with GIGLY-specific data
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  account_type        public.account_type   not null,
  -- DEVIATION (see part 1): admin flag, separate from the immutable account_type.
  role                public.user_role      not null default 'user',
  full_name           text                  not null,
  -- The plan syncs email from auth.users. Kept here for display and querying,
  -- but it is a cache: auth.users is the source of truth, and a trigger at the
  -- bottom of this file keeps it current so the two cannot drift.
  email               text                  not null,
  phone               text,
  avatar_url          text,
  location_lat        numeric(9, 6),
  location_lng        numeric(9, 6),
  location_text       text,
  onboarding_complete boolean               not null default false,
  status              public.account_status not null default 'active',
  created_at          timestamptz           not null default now(),
  updated_at          timestamptz           not null default now(),

  constraint profiles_lat_range check (location_lat between -90  and 90),
  constraint profiles_lng_range check (location_lng between -180 and 180)
);

-- DEVIATION from 4.1: the plan stores lat/lng as plain decimals, which a spatial
-- index cannot use — "gigs within 30 miles" would scan the whole table. This
-- generated column is what PostGIS actually queries against. It is derived and
-- never written to, so lat/lng remain the single source of truth.
alter table public.profiles
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

create index profiles_location_idx     on public.profiles using gist (location);
create index profiles_account_type_idx on public.profiles (account_type);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is
  'GIGLY user profile, one row per auth.users record. Section 4.1.';

-- ---------------------------------------------------------------------------
-- 4.2  entertainer_profiles
-- ---------------------------------------------------------------------------
create table public.entertainer_profiles (
  id                   uuid primary key default gen_random_uuid(),
  -- One-to-one with profiles, enforced by the unique constraint.
  user_id              uuid not null unique
                         references public.profiles (id) on delete cascade,
  stage_name           text not null,
  bio                  text,
  categories           text[] not null default '{}',
  -- Money is stored in pence throughout, per Section 4.2. Never floats.
  starting_price       integer,
  travel_radius_miles  integer not null default 30,
  -- Array of {type, url} objects: YouTube, Spotify, SoundCloud, Instagram.
  media_links          jsonb   not null default '[]'::jsonb,
  event_types          text[]  not null default '{}',
  profile_completeness integer not null default 0,
  verification_status  public.verification_status not null default 'unverified',
  -- Denormalised for display, per the plan. Maintained by triggers in parts 3
  -- and 5 rather than application code, so they cannot fall out of step.
  response_rate        numeric(5, 2),
  total_bookings       integer not null default 0,
  average_rating       numeric(3, 2),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint entertainer_bio_length     check (char_length(bio) <= 1000),
  constraint entertainer_price_positive check (starting_price >= 0),
  constraint entertainer_radius_sane    check (travel_radius_miles between 0 and 500),
  constraint entertainer_completeness   check (profile_completeness between 0 and 100),
  constraint entertainer_rating_range   check (average_rating between 1 and 5),
  constraint entertainer_media_is_array check (jsonb_typeof(media_links) = 'array')
);

-- GIN indexes make the Week 3 category and event-type filters index-backed.
create index entertainer_categories_idx  on public.entertainer_profiles using gin (categories);
create index entertainer_event_types_idx on public.entertainer_profiles using gin (event_types);

create trigger entertainer_profiles_set_updated_at
  before update on public.entertainer_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4.3  venue_profiles
-- ---------------------------------------------------------------------------
create table public.venue_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique
                              references public.profiles (id) on delete cascade,
  venue_name                text not null,
  venue_type                public.venue_type not null,
  address_line_1            text not null,
  address_line_2            text,
  city                      text not null,
  postcode                  text not null,
  description               text,
  entertainment_preferences text[] not null default '{}',
  website_url               text,
  venue_photos              text[] not null default '{}',
  verification_status       public.verification_status not null default 'unverified',
  total_gigs_posted         integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint venue_description_length check (char_length(description) <= 1000)
);

create index venue_prefs_idx on public.venue_profiles using gin (entertainment_preferences);
create index venue_city_idx  on public.venue_profiles (city);

create trigger venue_profiles_set_updated_at
  before update on public.venue_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Keeping profiles in step with auth.users
-- ---------------------------------------------------------------------------

-- Runs when Supabase Auth creates a user. account_type and full_name arrive in
-- the signup metadata (see signUp options.data in src/lib/supabase/auth.ts).
-- Creating the profile here rather than in a second client call means a user
-- can never exist without a profile, even if the browser closes mid-signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, account_type, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'account_type', 'entertainer')::public.account_type,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Closes the drift that the plan's "synced from auth.users" note leaves open.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$fn$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();
