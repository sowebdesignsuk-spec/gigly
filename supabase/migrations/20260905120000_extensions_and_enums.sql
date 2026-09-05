-- ============================================================================
-- GIGLY schema — part 1/6: extensions, enums, shared helpers
-- Implements Section 4 of GIGLY_Project_Build_Plan.docx (see docs/).
-- ============================================================================

-- PostGIS powers the "gigs within X miles" queries described in Section 5,
-- Week 3. Supabase convention is to keep extensions out of the public schema.
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Section 4.1. Immutable once set at signup.
create type public.account_type as enum ('entertainer', 'venue');

-- DEVIATION from Section 4.1: the plan has no admin role, but Section 5 Week 9
-- requires an admin dashboard behind a role check. Admin is deliberately a
-- SEPARATE axis from account_type, which the plan says must never change —
-- an admin is still an entertainer or a venue underneath.
create type public.user_role as enum ('user', 'admin');

create type public.account_status      as enum ('active', 'suspended', 'deleted');
create type public.verification_status as enum ('unverified', 'pending', 'verified');

-- Section 4.3
create type public.venue_type as enum (
  'pub', 'club', 'hotel', 'restaurant',
  'holiday_park', 'event_company', 'festival', 'other'
);

-- Section 4.4
create type public.gig_visibility as enum ('draft', 'published', 'closed', 'cancelled');

-- Section 4.5
create type public.application_status as enum (
  'sent', 'viewed', 'shortlisted', 'offered', 'accepted', 'declined', 'withdrawn'
);

-- Section 4.6
create type public.booking_status as enum (
  'confirmed', 'completed',
  'cancelled_by_venue', 'cancelled_by_entertainer',
  'disputed'
);

-- Section 4.7
create type public.availability_slot   as enum ('all_day', 'morning', 'afternoon', 'evening');
create type public.availability_status as enum ('available', 'unavailable', 'held', 'booked');

-- Section 4.10
create type public.notification_type as enum (
  'gig_match', 'application_received', 'application_update',
  'booking_confirmed', 'booking_cancelled',
  'message', 'review', 'system'
);

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Every table in Section 4 carries "updated_at — auto-updated on change".
-- One trigger function, attached per table in the migrations that follow.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Trigger function: stamps updated_at on every UPDATE.';
