-- ============================================================================
-- Week 4 — application notifications
-- Section 5, Week 4.6: "Add application status notifications."
--
-- These are triggers rather than application code because the RLS policy in
-- migration ...120500 gives clients no INSERT on notifications — a browser that
-- could write notifications could spam every user on the platform. Triggers run
-- SECURITY DEFINER, so the database writes them and the browser never can.
-- ============================================================================

-- Resolves an application to the two profile ids involved. Both sides are
-- needed by every trigger below, and doing it in one place keeps the joins
-- from being written slightly differently three times.
create or replace function public.application_parties(p_application_id uuid)
returns table (venue_user uuid, entertainer_user uuid, gig_title text, gig_id uuid)
language sql
stable
security definer
set search_path = public
as $fn$
  select v.user_id, e.user_id, g.title, g.id
    from public.applications a
    join public.gigs g                on g.id = a.gig_id
    join public.venue_profiles v      on v.id = g.venue_id
    join public.entertainer_profiles e on e.id = a.entertainer_id
   where a.id = p_application_id;
$fn$;

-- ---------------------------------------------------------------------------
-- New application → tell the venue
-- ---------------------------------------------------------------------------
create or replace function public.notify_application_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  parties record;
  act_name text;
begin
  select * into parties from public.application_parties(new.id);
  if parties is null then return null; end if;

  select stage_name into act_name
    from public.entertainer_profiles where id = new.entertainer_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    parties.venue_user,
    'application_received',
    coalesce(act_name, 'Someone') || ' applied',
    'New application for "' || parties.gig_title || '".',
    '/venue/gigs/' || parties.gig_id || '/applications'
  );

  return null;
end;
$fn$;

create trigger applications_notify_received
  after insert on public.applications
  for each row execute function public.notify_application_received();

-- ---------------------------------------------------------------------------
-- Status change → tell the entertainer
-- ---------------------------------------------------------------------------
create or replace function public.notify_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  parties record;
  headline text;
  detail   text;
begin
  -- 'viewed' is deliberately silent. Nobody wants a notification every time a
  -- venue opens a page, and it would drown the ones that matter.
  if new.status = old.status or new.status in ('viewed', 'withdrawn') then
    return null;
  end if;

  select * into parties from public.application_parties(new.id);
  if parties is null then return null; end if;

  case new.status
    when 'shortlisted' then
      headline := 'You have been shortlisted';
      detail   := 'For "' || parties.gig_title || '". Nothing to do yet.';
    when 'offered' then
      headline := 'You have an offer';
      detail   := '"' || parties.gig_title || '" is yours if you want it.';
    when 'declined' then
      headline := 'Not this time';
      detail   := 'The venue went another way on "' || parties.gig_title || '".';
    when 'accepted' then
      headline := 'Gig confirmed';
      detail   := 'You accepted "' || parties.gig_title || '".';
    else
      return null;
  end case;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    parties.entertainer_user,
    'application_update',
    headline,
    detail,
    '/entertainer/applications'
  );

  -- An accepted offer is news for the venue too — it is the moment the gig is
  -- actually filled.
  if new.status = 'accepted' then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      parties.venue_user,
      'application_update',
      'Your offer was accepted',
      '"' || parties.gig_title || '" is booked.',
      '/venue/gigs/' || parties.gig_id || '/applications'
    );
  end if;

  return null;
end;
$fn$;

create trigger applications_notify_status
  after update of status on public.applications
  for each row execute function public.notify_application_status();
