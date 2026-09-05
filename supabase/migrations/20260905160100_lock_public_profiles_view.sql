-- ============================================================================
-- Close a write path through public_profiles
--
-- Found by scripts/rls-check.sh during the Week 9 security audit.
--
-- public_profiles is a SECURITY INVOKER = OFF view, deliberately: that is what
-- lets it serve rows the caller cannot read from profiles directly. But the
-- same property applies to writes — an UPDATE through the view runs with the
-- view owner's rights and therefore bypasses the RLS on profiles.
--
-- The RLS migration granted SELECT on the view and assumed that was the only
-- privilege it had. Supabase's default privileges also grant INSERT, UPDATE
-- and DELETE on every new relation in public to anon and authenticated, and
-- the view is auto-updatable. So PostgREST accepted PATCH on it.
--
-- Two fixes, belt and braces: revoke the write privileges, and make the view
-- non-updatable in the first place so a future re-grant cannot reopen it.
-- ============================================================================

revoke insert, update, delete, truncate, references, trigger
  on public.public_profiles
  from anon, authenticated, public;

-- A view with a DISTINCT (or any non-trivial clause) is not auto-updatable
-- under PostgreSQL's rules. `distinct on (id)` is a no-op on a primary key,
-- so the rows are unchanged and the view simply stops accepting writes.
create or replace view public.public_profiles
  with (security_invoker = off) as
  select distinct on (id)
         id, account_type, full_name, avatar_url,
         location_text, location_lat, location_lng, created_at
    from public.profiles
   where status = 'active';

grant select on public.public_profiles to anon, authenticated;

-- The same default-privilege behaviour applies to every SECURITY INVOKER = OFF
-- view created from here on. Rather than changing schema-wide defaults (which
-- would also strip write grants from future tables and make their RLS moot),
-- the rule is procedural and lives in docs/DEPLOYMENT.md: any definer view
-- gets an explicit REVOKE of write privileges in the migration that creates
-- it, and scripts/rls-check.sh gets a PATCH assertion for it.
