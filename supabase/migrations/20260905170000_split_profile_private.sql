-- ============================================================================
-- Split private columns out of profiles
--
-- Resolves the Supabase Security Advisor finding on public_profiles ("view is
-- defined with the SECURITY DEFINER property") for the right reason rather
-- than by suppressing it.
--
-- The view needed definer rights only because profiles mixed public columns
-- (name, location) with private ones (email, phone) under an owner-only RLS
-- policy. Moving the private columns to their own table means:
--
--   * profiles holds nothing private, so it can have a plain public-read
--     policy for active rows and the view runs as the caller.
--   * There is no longer any privileged object standing between the public
--     and the table — the class of bug closed in ...160100 cannot recur.
--
-- role moves too: on a publicly readable table it would announce who the
-- admins are.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. New table, populated from the existing rows
-- ---------------------------------------------------------------------------
create table public.profile_private (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  email      text not null,
  phone      text,
  role       public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profile_private is
  'Columns a person may read about themselves and nobody else may read at all. '
  'Section 4.1 email and phone; the admin role. One row per profile.';

insert into public.profile_private (user_id, email, phone, role, created_at, updated_at)
select id, email, phone, role, created_at, updated_at
  from public.profiles;

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Functions that read the moved columns, repointed
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.profile_private pp
      join public.profiles p on p.id = pp.user_id
     where pp.user_id = auth.uid()
       and pp.role = 'admin'
       and p.status = 'active'
  );
$fn$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, account_type, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'account_type', 'entertainer')::public.account_type,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.profile_private (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;

  return new;
end;
$fn$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.email is distinct from old.email then
    update public.profile_private set email = new.email where user_id = new.id;
  end if;
  return new;
end;
$fn$;

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

  delete from storage.objects
   where bucket_id in ('avatars', 'venue-photos')
     and (storage.foldername(name))[1] = p_user_id::text;

  if not has_bookings then
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
     set stage_name  = 'Deleted act',
         bio         = null,
         media_links = '[]'::jsonb
   where user_id = p_user_id;

  update public.venue_profiles
     set description  = null,
         website_url  = null,
         venue_photos = '{}'
   where user_id = p_user_id;

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
-- 3. Drop the moved columns. Done after the functions are repointed so there
--    is no window where is_admin() references a column that is gone.
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop column email,
  drop column phone,
  drop column role;

-- ---------------------------------------------------------------------------
-- 4. RLS: profiles is public for active rows; profile_private is owner-only
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;

-- Anyone may read an active profile. This is what the marketplace is: names,
-- locations and photos are the shopfront. Suspended and deleted rows stay
-- invisible to everyone but their owner and admins.
create policy profiles_select_public on public.profiles
  for select using (status = 'active' or id = auth.uid() or public.is_admin());

alter table public.profile_private enable row level security;

create policy profile_private_select_own on public.profile_private
  for select using (user_id = auth.uid() or public.is_admin());

-- Only phone is user-editable. email follows auth.users via trigger and role
-- is admin-only; both are enforced by the WITH CHECK below refusing any row
-- where they differ from what is stored.
create policy profile_private_update_own on public.profile_private
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and email = (select email from public.profile_private where user_id = auth.uid())
    and role  = (select role  from public.profile_private where user_id = auth.uid())
  );

create policy profile_private_admin_all on public.profile_private
  for all using (public.is_admin()) with check (public.is_admin());

-- No INSERT policy: rows come from handle_new_user only.

-- ---------------------------------------------------------------------------
-- 5. The view, now running as the caller
--
-- With profiles publicly readable there is no need for definer rights. The
-- view is kept because every public page already reads it and it documents
-- which columns are meant for public display.
-- ---------------------------------------------------------------------------
drop view if exists public.public_profiles;

create view public.public_profiles
  with (security_invoker = on) as
  select id, account_type, full_name, avatar_url,
         location_text, location_lat, location_lng, created_at
    from public.profiles
   where status = 'active';

comment on view public.public_profiles is
  'Columns of profiles intended for public display. Runs as the caller; the '
  'profiles RLS policy is what applies.';

grant select on public.public_profiles to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.public_profiles
  from anon, authenticated, public;
