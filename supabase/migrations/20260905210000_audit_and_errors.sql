-- ============================================================================
-- Week 9–10 — accountability and error visibility
--
-- Two tables the plan does not name but which its own requirements imply:
--
--   * admin_audit — Week 9.2 asks for GDPR-compliant deletion. Under UK GDPR
--     accountability, being able to erase someone is only half of it; you also
--     have to be able to show who did it and when. Without a log, "we erased
--     that account on request" is an unevidenced claim.
--
--   * error_log — Week 9.7 asks for error monitoring. Sentry needs an account
--     and a DSN, and until one exists errors vanish into Vercel's function
--     logs where nobody looks. This is the floor: somewhere errors land that
--     an admin can actually see. Sentry replaces it, it does not compete.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admin_audit
-- ---------------------------------------------------------------------------
create table public.admin_audit (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  -- Denormalised deliberately: the whole point is that the record survives the
  -- actor's account being deleted.
  actor_email text,
  action      text not null,
  subject_id  uuid,
  subject     text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_recent_idx on public.admin_audit (created_at desc);
create index admin_audit_subject_idx on public.admin_audit (subject_id);

alter table public.admin_audit enable row level security;

create policy admin_audit_select_admin on public.admin_audit
  for select using (public.is_admin());

-- No insert, update or delete policy for anyone. Rows are written only by the
-- SECURITY DEFINER function below, and an audit log a person can edit is not
-- an audit log.

create or replace function public.log_admin_action(
  p_action     text,
  p_subject_id uuid default null,
  p_subject    text default null,
  p_detail     jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.admin_audit (actor_id, actor_email, action, subject_id, subject, detail)
  values (
    auth.uid(),
    (select email from public.profile_private where user_id = auth.uid()),
    p_action, p_subject_id, p_subject, coalesce(p_detail, '{}'::jsonb)
  );
end;
$fn$;

grant execute on function public.log_admin_action to authenticated;

-- ---------------------------------------------------------------------------
-- Existing admin functions now record what they did
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
declare
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own status.';
  end if;

  select email into target_email from public.profile_private where user_id = p_user_id;

  update public.profiles set status = p_status where id = p_user_id;

  update auth.users
     set banned_until = case when p_status = 'suspended' then 'infinity'::timestamptz else null end
   where id = p_user_id;

  perform public.log_admin_action(
    'user.' || p_status::text, p_user_id, target_email, jsonb_build_object('status', p_status)
  );
end;
$fn$;

create or replace function public.admin_set_gig_visibility(
  p_gig_id     uuid,
  p_visibility public.gig_visibility
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  gig_title text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select title into gig_title from public.gigs where id = p_gig_id;

  update public.gigs set visibility = p_visibility where id = p_gig_id;

  perform public.log_admin_action(
    'gig.' || p_visibility::text, p_gig_id, gig_title,
    jsonb_build_object('visibility', p_visibility)
  );
end;
$fn$;

-- admin_erase_user is rewritten wholesale so the log entry records which of
-- the two paths ran — the difference matters if anyone ever asks.
create or replace function public.admin_erase_user(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  has_bookings boolean;
  target_email text;
  outcome      text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot erase your own account from here.';
  end if;

  select email into target_email from public.profile_private where user_id = p_user_id;

  select exists (
    select 1 from public.bookings b
      left join public.venue_profiles v       on v.id = b.venue_id
      left join public.entertainer_profiles e on e.id = b.entertainer_id
     where v.user_id = p_user_id or e.user_id = p_user_id
  ) into has_bookings;

  delete from storage.objects
   where bucket_id in ('avatars', 'venue-photos')
     and (storage.foldername(name))[1] = p_user_id::text;

  if not has_bookings then
    -- Logged before the delete: the foreign key is ON DELETE SET NULL, so the
    -- row survives with actor_email and subject intact.
    perform public.log_admin_action(
      'user.erased', p_user_id, target_email, jsonb_build_object('mode', 'hard_delete')
    );
    delete from auth.users where id = p_user_id;
    return 'erased';
  end if;

  update public.profiles
     set full_name     = 'Deleted user',
         avatar_url    = null,
         location_lat  = null,
         location_lng  = null,
         location_text = null,
         status        = 'deleted'
   where id = p_user_id;

  update public.profile_private
     set email = p_user_id::text || '@erased.invalid',
         phone = null,
         role  = 'user'
   where user_id = p_user_id;

  update public.entertainer_profiles
     set stage_name = 'Deleted act', bio = null, media_links = '[]'::jsonb
   where user_id = p_user_id;

  update public.venue_profiles
     set description = null, website_url = null, venue_photos = '{}'
   where user_id = p_user_id;

  update public.gigs g
     set visibility = 'cancelled'
    from public.venue_profiles v
   where v.id = g.venue_id and v.user_id = p_user_id
     and g.visibility in ('draft', 'published');

  delete from public.messages where sender_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;

  update auth.users set banned_until = 'infinity'::timestamptz where id = p_user_id;

  outcome := 'anonymised';
  perform public.log_admin_action(
    'user.erased', p_user_id, target_email,
    jsonb_build_object('mode', 'anonymised', 'reason', 'has bookings')
  );
  return outcome;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- error_log
-- ---------------------------------------------------------------------------
create table public.error_log (
  id         bigint generated always as identity primary key,
  digest     text,
  message    text not null,
  path       text,
  user_id    uuid references public.profiles (id) on delete set null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index error_log_recent_idx on public.error_log (created_at desc);

alter table public.error_log enable row level security;

create policy error_log_select_admin on public.error_log
  for select using (public.is_admin());

-- Written only through the function below, so a client cannot flood the table
-- with arbitrary rows.
create or replace function public.record_error(
  p_message    text,
  p_digest     text default null,
  p_path       text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- One row per digest per minute. A broken page hit by a crawler would
  -- otherwise write thousands of identical rows and bury everything else.
  if p_digest is not null and exists (
    select 1 from public.error_log
     where digest = p_digest and created_at > now() - interval '1 minute'
  ) then
    return;
  end if;

  insert into public.error_log (digest, message, path, user_id, user_agent)
  values (p_digest, left(p_message, 2000), left(p_path, 500), auth.uid(), left(p_user_agent, 300));
end;
$fn$;

grant execute on function public.record_error to anon, authenticated;

-- Keeps the free tier honest: errors older than 30 days are noise.
create or replace function public.prune_error_log()
returns void
language sql
security definer
set search_path = public
as $fn$
  delete from public.error_log where created_at < now() - interval '30 days';
$fn$;

grant execute on function public.prune_error_log to authenticated;
