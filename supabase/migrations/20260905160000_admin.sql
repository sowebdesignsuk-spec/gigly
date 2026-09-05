-- ============================================================================
-- Weeks 9–10 — admin
-- Section 5, Week 9: user management, moderation, GDPR handling, analytics.
--
-- Every function here re-checks is_admin() itself. The /admin routes are also
-- gated in the proxy, but a SECURITY DEFINER function is callable by anyone
-- who can reach PostgREST, so the route guard is not the boundary — this is.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admin_stats — Week 9.3 "basic analytics view"
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns table (
  users_total          bigint,
  users_entertainers   bigint,
  users_venues         bigint,
  users_new_7d         bigint,
  users_suspended      bigint,
  gigs_total           bigint,
  gigs_published       bigint,
  gigs_new_7d          bigint,
  applications_total   bigint,
  applications_new_7d  bigint,
  offers_open          bigint,
  bookings_total       bigint,
  reviews_hidden       bigint
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    (select count(*) from profiles where status <> 'deleted'),
    (select count(*) from profiles where account_type = 'entertainer' and status <> 'deleted'),
    (select count(*) from profiles where account_type = 'venue' and status <> 'deleted'),
    (select count(*) from profiles where created_at >= now() - interval '7 days'),
    (select count(*) from profiles where status = 'suspended'),
    (select count(*) from gigs),
    (select count(*) from gigs where visibility = 'published' and date >= current_date),
    (select count(*) from gigs where created_at >= now() - interval '7 days'),
    (select count(*) from applications),
    (select count(*) from applications where created_at >= now() - interval '7 days'),
    (select count(*) from applications where status = 'offered'),
    (select count(*) from bookings),
    (select count(*) from reviews where not is_visible)
  where public.is_admin();
$fn$;

-- ---------------------------------------------------------------------------
-- admin_set_user_status — Week 9.2 suspension
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status  public.account_status
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  -- An admin cannot suspend themselves. Locking the only admin out of the
  -- platform is not a mistake anyone should be able to make with one click.
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own status.';
  end if;

  update public.profiles set status = p_status where id = p_user_id;

  -- A suspended account cannot sign in either — otherwise "suspended" is a
  -- label on a user who is still using the platform.
  update auth.users
     set banned_until = case when p_status = 'suspended' then 'infinity'::timestamptz else null end
   where id = p_user_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- admin_erase_user — Week 9.2 "GDPR-compliant data handling"
--
-- Two paths, because bookings are financial records and carry ON DELETE
-- RESTRICT:
--
--   * No bookings → hard delete from auth.users. Everything cascades. The
--     person is gone.
--   * Has bookings → personal data is scrubbed from every row and the account
--     is banned, but the booking rows survive with an anonymised party. This is
--     the GDPR "legitimate interest" retention for transactional records, and
--     it is what a right-to-erasure request is meant to leave behind.
--
-- Returns which path ran, so the admin UI can say so honestly.
-- ---------------------------------------------------------------------------
create or replace function public.admin_erase_user(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  has_bookings boolean;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot erase your own account from here.';
  end if;

  select exists (
    select 1 from public.bookings b
      left join public.venue_profiles v       on v.id = b.venue_id
      left join public.entertainer_profiles e on e.id = b.entertainer_id
     where v.user_id = p_user_id or e.user_id = p_user_id
  ) into has_bookings;

  -- Uploaded images are personal data on either path. Deleting the metadata
  -- row makes the object unreachable through the public URL immediately; the
  -- bytes are reaped by Supabase's storage garbage collection.
  delete from storage.objects
   where bucket_id in ('avatars', 'venue-photos')
     and (storage.foldername(name))[1] = p_user_id::text;

  if not has_bookings then
    delete from auth.users where id = p_user_id;
    return 'erased';
  end if;

  update public.profiles
     set full_name     = 'Deleted user',
         email         = p_user_id::text || '@erased.invalid',
         phone         = null,
         avatar_url    = null,
         location_lat  = null,
         location_lng  = null,
         location_text = null,
         status        = 'deleted'
   where id = p_user_id;

  update public.entertainer_profiles
     set stage_name  = 'Deleted act',
         bio         = null,
         media_links = '[]'::jsonb
   where user_id = p_user_id;

  update public.venue_profiles
     set description  = null,
         website_url  = null,
         venue_photos = '{}'
   where user_id = p_user_id;

  -- Drafts and open listings from an erased venue are noise; close them.
  update public.gigs g
     set visibility = 'cancelled'
    from public.venue_profiles v
   where v.id = g.venue_id and v.user_id = p_user_id
     and g.visibility in ('draft', 'published');

  delete from public.messages where sender_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;

  update auth.users
     set banned_until = 'infinity'::timestamptz
   where id = p_user_id;

  return 'anonymised';
end;
$fn$;

-- ---------------------------------------------------------------------------
-- admin_set_gig_visibility — Week 9.1 gig moderation
-- The gigs RLS policy already lets admins update, so this is a thin wrapper
-- that exists to keep every moderation action on the same audit path.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_gig_visibility(
  p_gig_id     uuid,
  p_visibility public.gig_visibility
)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.gigs set visibility = p_visibility
   where id = p_gig_id and public.is_admin();
$fn$;

grant execute on function public.admin_stats              to authenticated;
grant execute on function public.admin_set_user_status    to authenticated;
grant execute on function public.admin_erase_user         to authenticated;
grant execute on function public.admin_set_gig_visibility to authenticated;

-- ---------------------------------------------------------------------------
-- Promoting the first admin
--
-- There is deliberately no self-service route to admin. Run this once in the
-- Supabase SQL editor, replacing the address:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ---------------------------------------------------------------------------
