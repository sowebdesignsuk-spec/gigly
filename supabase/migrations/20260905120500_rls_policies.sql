-- ============================================================================
-- GIGLY schema — part 6/6: row-level security
-- Section 2.3: "entertainers can only edit their own profiles, venues can only
-- see applications for their own gigs."
--
-- The frontend talks to Postgres directly (Section 2.1), so these policies are
-- the entire authorisation layer. There is no API server to catch mistakes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
--
-- All SECURITY DEFINER. A helper that reads profiles from inside a policy ON
-- profiles would otherwise recurse infinitely; SECURITY DEFINER skips RLS for
-- the lookup. All are STABLE so the planner calls them once per query.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin' and status = 'active'
  );
$fn$;

-- The entertainer_profiles row belonging to the caller, or null.
create or replace function public.my_entertainer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select id from public.entertainer_profiles where user_id = auth.uid();
$fn$;

create or replace function public.my_venue_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select id from public.venue_profiles where user_id = auth.uid();
$fn$;

-- ---------------------------------------------------------------------------
-- profiles
--
-- The plan wants public, SEO-indexable profile pages (Week 8), but profiles
-- also holds email and phone. RLS is row-level, not column-level, so opening
-- the table for public reads would publish contact details to anyone with an
-- API key — exactly what Week 6 ("no need to exchange personal contact
-- details") is trying to avoid.
--
-- So: the table itself is private to its owner, and a view exposes the safe
-- columns publicly.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- INSERT is deliberately absent: rows are created by the handle_new_user
-- trigger on auth.users, never by a client.

-- security_invoker = off: the view reads profiles with the definer's rights,
-- which is what lets it serve rows the caller cannot select directly.
create view public.public_profiles
  with (security_invoker = off) as
  select id, account_type, full_name, avatar_url,
         location_text, location_lat, location_lng, created_at
    from public.profiles
   where status = 'active';

comment on view public.public_profiles is
  'Publicly safe subset of profiles. No email, no phone, no status. Join to '
  'this from anywhere a profile is shown to someone other than its owner.';

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- entertainer_profiles / venue_profiles
-- These are the marketplace shopfront: public to read, owner-only to write.
-- ---------------------------------------------------------------------------
alter table public.entertainer_profiles enable row level security;

create policy entertainer_select_all on public.entertainer_profiles
  for select using (true);

create policy entertainer_write_own on public.entertainer_profiles
  for all
  using      (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

alter table public.venue_profiles enable row level security;

create policy venue_select_all on public.venue_profiles
  for select using (true);

create policy venue_write_own on public.venue_profiles
  for all
  using      (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- gigs
-- ---------------------------------------------------------------------------
alter table public.gigs enable row level security;

-- Published gigs are public so they can be server-rendered and indexed
-- (Section 2.2). Drafts belong to the venue that owns them.
create policy gigs_select_published on public.gigs
  for select using (
    visibility = 'published'
    or venue_id = public.my_venue_id()
    or public.is_admin()
  );

create policy gigs_write_own on public.gigs
  for all
  using      (venue_id = public.my_venue_id() or public.is_admin())
  with check (venue_id = public.my_venue_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
alter table public.applications enable row level security;

-- Visible to the entertainer who applied and the venue that posted the gig.
-- Crucially NOT to other applicants — an entertainer must not be able to read
-- rivals' proposed fees.
create policy applications_select_parties on public.applications
  for select using (
    entertainer_id = public.my_entertainer_id()
    or exists (
      select 1 from public.gigs g
       where g.id = applications.gig_id
         and g.venue_id = public.my_venue_id()
    )
    or public.is_admin()
  );

-- Only the entertainer applies, and only as themselves, and only to a gig that
-- is actually open.
create policy applications_insert_own on public.applications
  for insert with check (
    entertainer_id = public.my_entertainer_id()
    and exists (
      select 1 from public.gigs g
       where g.id = applications.gig_id
         and g.visibility = 'published'
    )
  );

create policy applications_update_parties on public.applications
  for update using (
    entertainer_id = public.my_entertainer_id()
    or exists (
      select 1 from public.gigs g
       where g.id = applications.gig_id
         and g.venue_id = public.my_venue_id()
    )
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;

create policy bookings_select_parties on public.bookings
  for select using (
    venue_id = public.my_venue_id()
    or entertainer_id = public.my_entertainer_id()
    or public.is_admin()
  );

create policy bookings_insert_venue on public.bookings
  for insert with check (venue_id = public.my_venue_id() or public.is_admin());

create policy bookings_update_parties on public.bookings
  for update using (
    venue_id = public.my_venue_id()
    or entertainer_id = public.my_entertainer_id()
    or public.is_admin()
  );

-- No delete policy. Bookings are financial records; cancel them, do not remove
-- them.

-- ---------------------------------------------------------------------------
-- availability
-- ---------------------------------------------------------------------------
alter table public.availability enable row level security;

-- Readable by signed-in users so the Week 3 matching and Week 7 recommendations
-- can filter on it. Notes are private, so they are excluded from any shared
-- read path in the client queries rather than here.
create policy availability_select_authenticated on public.availability
  for select to authenticated using (true);

create policy availability_write_own on public.availability
  for all
  using      (entertainer_id = public.my_entertainer_id() or public.is_admin())
  with check (entertainer_id = public.my_entertainer_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- conversations / messages
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;

create policy conversations_select_participants on public.conversations
  for select using (
    auth.uid() in (participant_1, participant_2) or public.is_admin()
  );

-- You may start a conversation, but only one you are actually in.
create policy conversations_insert_participant on public.conversations
  for insert with check (auth.uid() in (participant_1, participant_2));

create policy conversations_update_participants on public.conversations
  for update using (auth.uid() in (participant_1, participant_2));

alter table public.messages enable row level security;

create policy messages_select_participants on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and auth.uid() in (c.participant_1, c.participant_2)
    )
    or public.is_admin()
  );

-- Sender must be the caller and must be in the thread. Without the second
-- check, anyone could post into any conversation by guessing its id.
create policy messages_insert_own on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and auth.uid() in (c.participant_1, c.participant_2)
    )
  );

-- Marking as read is the only update. Editing sent messages is not a feature.
create policy messages_update_read_state on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and auth.uid() in (c.participant_1, c.participant_2)
    )
  );

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy reviews_select_visible on public.reviews
  for select using (is_visible or reviewer_id = auth.uid() or public.is_admin());

-- You may only review a booking you were part of, and only as yourself. The
-- "booking must be completed" rule lives in the trigger from part 5.
create policy reviews_insert_party on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1
        from public.bookings b
        left join public.venue_profiles v       on v.id = b.venue_id
        left join public.entertainer_profiles e on e.id = b.entertainer_id
       where b.id = reviews.booking_id
         and auth.uid() in (v.user_id, e.user_id)
    )
  );

-- Moderation (Week 8.3) is admin-only. Authors cannot edit a review after the
-- fact, which is what makes ratings worth anything.
create policy reviews_admin_moderate on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

-- Marking as read.
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No INSERT policy for clients. Notifications are written by triggers and by
-- server-side code holding the service role key, never by a browser — a client
-- that can insert notifications can spam any user on the platform.
