-- ============================================================================
-- Week 3 — gig discovery
-- Section 5, Week 3.3, 3.4, 3.7, 3.8: filtered browse, distance search,
-- keyword search, and matching.
-- ============================================================================

-- Miles are what UK entertainers actually think in ("I'll travel 30 miles"),
-- but PostGIS works in metres. Converting in one place stops the constant
-- creeping into a dozen queries.
create or replace function public.miles_to_metres(miles double precision)
returns double precision
language sql
immutable
parallel safe
as $fn$
  select miles * 1609.344;
$fn$;

-- ---------------------------------------------------------------------------
-- search_gigs
--
-- SECURITY INVOKER (the default) is deliberate: the gigs RLS policy still
-- applies inside the function, so this cannot become a way to read draft
-- listings belonging to other venues. Every filter is optional, so the same
-- function serves the unfiltered browse, the filtered search, and the Week 3.8
-- matching query.
-- ---------------------------------------------------------------------------
create or replace function public.search_gigs(
  p_lat           double precision default null,
  p_lng           double precision default null,
  p_radius_miles  integer          default null,
  p_categories    text[]           default null,
  p_date_from     date             default null,
  p_date_to       date             default null,
  p_budget_min    integer          default null,
  p_query         text             default null,
  p_limit         integer          default 24,
  p_offset        integer          default 0
)
returns table (
  id                uuid,
  venue_id          uuid,
  title             text,
  category          text,
  description       text,
  date              date,
  start_time        time,
  end_time          time,
  location_text     text,
  budget_min        integer,
  budget_max        integer,
  is_urgent         boolean,
  is_featured       boolean,
  application_count integer,
  created_at        timestamptz,
  venue_name        text,
  venue_type        public.venue_type,
  distance_miles    double precision
)
language sql
stable
as $fn$
  select
    g.id,
    g.venue_id,
    g.title,
    g.category,
    g.description,
    g.date,
    g.start_time,
    g.end_time,
    g.location_text,
    g.budget_min,
    g.budget_max,
    g.is_urgent,
    g.is_featured,
    g.application_count,
    g.created_at,
    v.venue_name,
    v.venue_type,
    case
      when p_lat is not null and p_lng is not null and g.location is not null
      then extensions.st_distance(
             g.location,
             extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
           ) / 1609.344
    end as distance_miles
  from public.gigs g
  join public.venue_profiles v on v.id = g.venue_id
  where g.visibility = 'published'
    -- Past gigs are noise. A venue that wants an old listing back can
    -- change the date.
    and g.date >= current_date
    and (p_categories is null or g.category = any (p_categories))
    and (p_date_from is null or g.date >= p_date_from)
    and (p_date_to   is null or g.date <= p_date_to)
    -- "Pays at least X" means the top of the range clears X, so an act is not
    -- hidden from a £200–£400 gig when they asked for £300.
    and (p_budget_min is null or coalesce(g.budget_max, g.budget_min) >= p_budget_min)
    and (
      p_query is null
      or g.title         ilike '%' || p_query || '%'
      or g.description   ilike '%' || p_query || '%'
      or g.location_text ilike '%' || p_query || '%'
      or v.venue_name    ilike '%' || p_query || '%'
    )
    and (
      p_lat is null or p_lng is null or p_radius_miles is null
      or g.location is null
      -- ST_DWithin uses the GiST index; ST_Distance(...) < x would not.
      or extensions.st_dwithin(
           g.location,
           extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
           public.miles_to_metres(p_radius_miles)
         )
    )
  order by
    g.is_featured desc,
    g.is_urgent desc,
    g.date asc,
    g.created_at desc
  limit greatest(least(p_limit, 100), 1)
  offset greatest(p_offset, 0);
$fn$;

comment on function public.search_gigs is
  'Filtered gig search with optional distance. Runs as the caller, so gigs RLS still applies.';

grant execute on function public.search_gigs to anon, authenticated;
grant execute on function public.miles_to_metres to anon, authenticated;
