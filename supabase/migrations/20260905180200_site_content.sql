-- ============================================================================
-- Site content — a small CMS for the public pages
--
-- Not in the build plan; requested so the homepage copy can be edited without
-- a deploy. Deliberately minimal: a key/value store of text blocks. The
-- defaults live in code (src/lib/cms/defaults.ts); this table holds only
-- overrides, so an empty table renders a complete site and an admin edit
-- changes exactly one block.
-- ============================================================================

create table public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,

  -- Keys are dotted paths like "home.hero.title". Keeps the admin list sortable
  -- and stops a stray space becoming an unreachable block.
  constraint site_content_key_format check (key ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$')
);

create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;

-- Public pages are server-rendered for anonymous visitors, so reads are open.
create policy site_content_select_all on public.site_content
  for select using (true);

create policy site_content_admin_write on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());
