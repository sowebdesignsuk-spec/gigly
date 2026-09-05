-- ============================================================================
-- app_settings — operational configuration editable from /admin/settings
--
-- Deliberately NOT a place for secrets.
--
-- An API key stored here would be readable by anything holding an admin
-- session, would sit in a database whose backups and replicas travel further
-- than a Vercel environment variable does, and — worst — would tempt a future
-- reader into fetching it from the browser. Secrets stay in Vercel's
-- environment, which is encrypted at rest, scoped per environment, and never
-- reaches the client bundle. The settings page reports which of them are
-- present by reading process.env server-side, and tells the admin where to put
-- the missing ones.
--
-- What lives here is the configuration that is genuinely content: SEO
-- defaults, verification tokens (which are public by design — they end up in a
-- meta tag), analytics ids (likewise), social links, and switches.
-- ============================================================================

create table public.app_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,

  constraint app_settings_key_format check (key ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$')
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

-- Public read: every value here is one that ends up rendered into a public
-- page anyway (a meta tag, a footer link, an analytics id). Anything that
-- would not be safe on a public page does not belong in this table.
create policy app_settings_select_all on public.app_settings
  for select using (true);

create policy app_settings_admin_write on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.app_settings is
  'Operational settings editable by an admin. Public-readable by design — '
  'never store credentials here; those belong in environment variables.';
