-- ============================================================================
-- Week 5 — bookings and calendar
-- Section 5, Week 5.1, 5.3, 5.4, 5.9: booking on accept, availability marked
-- booked, listing closed, cancellation with notifications.
--
-- All of it is triggers. Accepting an offer must atomically create the
-- booking, block the date and close the gig; if any of those ran in
-- application code, a dropped connection between steps would leave a booked
-- act with a free diary or an open listing for a filled slot.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Accepting an offer creates the booking — Week 5.1
-- ---------------------------------------------------------------------------
create or replace function public.create_booking_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  g record;
  b_id uuid;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then
    return null;
  end if;

  select * into g from public.gigs where id = new.gig_id;

  insert into public.bookings (gig_id, application_id, venue_id, entertainer_id, agreed_fee)
  values (
    new.gig_id,
    new.id,
    g.venue_id,
    new.entertainer_id,
    -- The act's quote wins if they made one; otherwise the advertised fee.
    coalesce(new.proposed_fee, g.budget_min)
  )
  returning id into b_id;

  -- Week 5.3: the date is now taken.
  insert into public.availability (entertainer_id, date, time_slot, status, booking_id)
  values (new.entertainer_id, g.date, 'all_day', 'booked', b_id)
  on conflict (entertainer_id, date, time_slot)
    do update set status = 'booked', booking_id = excluded.booking_id;

  -- Week 5.4: one act per listing for the MVP. Close it.
  update public.gigs set visibility = 'closed' where id = new.gig_id;

  -- Everyone else who was still waiting hears now rather than never.
  update public.applications
     set status = 'declined'
   where gig_id = new.gig_id
     and id <> new.id
     and status in ('sent', 'viewed', 'shortlisted', 'offered');

  return null;
end;
$fn$;

create trigger applications_create_booking
  after update of status on public.applications
  for each row execute function public.create_booking_on_accept();

-- ---------------------------------------------------------------------------
-- Booking lifecycle notifications and diary upkeep — Week 5.9, Week 7.2
-- ---------------------------------------------------------------------------
create or replace function public.on_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  g          record;
  venue_user uuid;
  act_user   uuid;
  act_name   text;
  venue_name text;
begin
  select * into g from public.gigs where id = new.gig_id;
  select v.user_id, v.venue_name into venue_user, venue_name
    from public.venue_profiles v where v.id = new.venue_id;
  select e.user_id, e.stage_name into act_user, act_name
    from public.entertainer_profiles e where e.id = new.entertainer_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, link) values
      (act_user,   'booking_confirmed', 'Booking confirmed',
       g.title || ' at ' || venue_name || ' on ' || to_char(g.date, 'FMDay FMDD Mon') || '.',
       '/entertainer/bookings/' || new.id),
      (venue_user, 'booking_confirmed', act_name || ' is booked',
       g.title || ' on ' || to_char(g.date, 'FMDay FMDD Mon') || ' is confirmed.',
       '/venue/bookings/' || new.id);
    return null;
  end if;

  if new.status = old.status then
    return null;
  end if;

  if new.status in ('cancelled_by_venue', 'cancelled_by_entertainer') then
    -- Free the date.
    update public.availability
       set status = 'available', booking_id = null
     where booking_id = new.id;

    -- Tell the party who did not cancel.
    if new.status = 'cancelled_by_venue' then
      insert into public.notifications (user_id, type, title, body, link) values
        (act_user, 'booking_cancelled', 'Booking cancelled by ' || venue_name,
         g.title || ' on ' || to_char(g.date, 'FMDay FMDD Mon') || '. '
           || coalesce('Reason: ' || new.cancellation_reason, ''),
         '/entertainer/bookings/' || new.id);
    else
      insert into public.notifications (user_id, type, title, body, link) values
        (venue_user, 'booking_cancelled', act_name || ' has cancelled',
         g.title || ' on ' || to_char(g.date, 'FMDay FMDD Mon') || ' needs a new act. '
           || coalesce('Reason: ' || new.cancellation_reason, ''),
         '/venue/gigs/' || g.id || '/applications');

      -- The venue needs a replacement: reopen the listing if there is still
      -- time. Phase 3's replacement matching builds on this.
      if g.date >= current_date then
        update public.gigs set visibility = 'published' where id = g.id;
      end if;
    end if;
    return null;
  end if;

  if new.status = 'completed' then
    insert into public.notifications (user_id, type, title, body, link) values
      (act_user,   'review', 'How was ' || venue_name || '?',
       'Leave a review for ' || g.title || '.', '/entertainer/bookings/' || new.id),
      (venue_user, 'review', 'How was ' || act_name || '?',
       'Leave a review for ' || g.title || '.', '/venue/bookings/' || new.id);
  end if;

  return null;
end;
$fn$;

create trigger bookings_on_change
  after insert or update of status on public.bookings
  for each row execute function public.on_booking_change();

-- ---------------------------------------------------------------------------
-- Completion — bookings whose date has passed become 'completed'
--
-- There is no scheduler on the free tier, so this is called lazily by the
-- booking pages on load. Idempotent; cheap; runs as definer so it can touch
-- every party's rows in one pass.
-- ---------------------------------------------------------------------------
create or replace function public.mark_completed_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n integer;
begin
  update public.bookings b
     set status = 'completed'
    from public.gigs g
   where g.id = b.gig_id
     and b.status = 'confirmed'
     and g.date < current_date;
  get diagnostics n = row_count;
  return n;
end;
$fn$;

grant execute on function public.mark_completed_bookings to authenticated;
