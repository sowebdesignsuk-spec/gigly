-- ============================================================================
-- Demo data, expanded
--
-- Adds photography to the demo accounts and roughly triples the dataset, so a
-- seeded database reads like a working marketplace rather than a wireframe:
-- 13 venues and 18 acts across 13 UK cities, with gigs spread far enough apart
-- that distance search actually has to do something.
--
-- Everything still hangs off @demo.gigly.invalid, so remove_demo_data() clears
-- all of it without knowing anything about what was added here.
--
-- Image URLs are Unsplash, sized at their CDN. publicImageUrl() passes a full
-- http(s) URL straight through, so these work anywhere a storage path does.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Photography for the demo accounts
-- ---------------------------------------------------------------------------
create or replace function public.seed_demo_media()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  avatar_params text := '?w=400&h=400&fit=crop&q=70&auto=format';
  wide_params   text := '?w=1200&h=900&fit=crop&q=70&auto=format';
  base          text := 'https://images.unsplash.com/';
  act_shots     jsonb := jsonb_build_object(
    'ruby@demo.gigly.invalid',  'photo-1511671782779-c97d3d27a1d4',
    'neon@demo.gigly.invalid',  'photo-1549213783-8284d0336c4f',
    'kyle@demo.gigly.invalid',  'photo-1485579149621-3123dd979885',
    'soul@demo.gigly.invalid',  'photo-1516450360452-9312f5e86fc7',
    'maria@demo.gigly.invalid', 'photo-1543007630-9710e4a00a20',
    'deck@demo.gigly.invalid',  'photo-1470225620780-dba8ba36b745',
    'stan@demo.gigly.invalid',  'photo-1493225457124-a3eb161ffa5f',
    'lila@demo.gigly.invalid',  'photo-1547153760-18fc86324498',
    'jess@demo.gigly.invalid',  'photo-1506157786151-b8491531f063',
    'tommy@demo.gigly.invalid', 'photo-1501386761578-eac5c94b800a',
    'cara@demo.gigly.invalid',  'photo-1533174072545-7a4b6ad7a6c3',
    'raj@demo.gigly.invalid',   'photo-1514525253161-7a46d19cd819',
    'nina@demo.gigly.invalid',  'photo-1459749411175-04bf5292ceea',
    'dex@demo.gigly.invalid',   'photo-1524368535928-5b5e00ddc76b',
    'ollie@demo.gigly.invalid', 'photo-1574391884720-bbc3740c59d1',
    'fay@demo.gigly.invalid',   'photo-1519671482749-fd09be7ccebf',
    'george@demo.gigly.invalid','photo-1560439514-4e9645039924',
    'sasha@demo.gigly.invalid', 'photo-1572116469696-31de0f17cc34'
  );
  venue_shots jsonb := jsonb_build_object(
    'pub',           array['photo-1572116469696-31de0f17cc34','photo-1519671482749-fd09be7ccebf'],
    'club',          array['photo-1574391884720-bbc3740c59d1','photo-1514525253161-7a46d19cd819'],
    'hotel',         array['photo-1543007630-9710e4a00a20','photo-1414235077428-338989a2e8c0'],
    'restaurant',    array['photo-1414235077428-338989a2e8c0','photo-1519671482749-fd09be7ccebf'],
    'holiday_park',  array['photo-1524368535928-5b5e00ddc76b','photo-1506157786151-b8491531f063'],
    'event_company', array['photo-1560439514-4e9645039924','photo-1516450360452-9312f5e86fc7'],
    'festival',      array['photo-1506157786151-b8491531f063','photo-1459749411175-04bf5292ceea'],
    'other',         array['photo-1519671482749-fd09be7ccebf','photo-1572116469696-31de0f17cc34']
  );
  r record;
begin
  -- Acts: one photo each, matched to what they do.
  for r in
    select p.id, pp.email from public.profiles p
      join public.profile_private pp on pp.user_id = p.id
     where pp.email like '%@demo.gigly.invalid'
       and p.account_type = 'entertainer'
  loop
    if act_shots ? r.email then
      update public.profiles
         set avatar_url = base || (act_shots ->> r.email) || avatar_params
       where id = r.id;
    end if;
  end loop;

  -- Venues: two shots each, picked by venue type.
  for r in
    select v.id, v.venue_type from public.venue_profiles v
      join public.profile_private pp on pp.user_id = v.user_id
     where pp.email like '%@demo.gigly.invalid'
  loop
    update public.venue_profiles
       set venue_photos = array(
             select base || s || wide_params
               from unnest(
                 array(select jsonb_array_elements_text(venue_shots -> r.venue_type::text))
               ) as s
           )
     where id = r.id
       and coalesce(array_length(venue_photos, 1), 0) = 0;
  end loop;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- More venues, acts and gigs
-- ---------------------------------------------------------------------------
create or replace function public.seed_demo_extra()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  u uuid;
  vp uuid;
  ep uuid;
  rec record;
  -- venue email, contact name, venue name, type, address, city, postcode,
  -- description, prefs, lat, lng
  venues constant jsonb := jsonb_build_array(
    jsonb_build_array('crownbristol@demo.gigly.invalid','Ellie Marsh','The Crown & Anchor','pub','62 Gloucester Road','Bristol','BS7 8BH',
      'Two-room pub off the Gloucester Road with a stage in the back bar. Live music Thursday to Sunday, capacity 90, crowd in their 20s and 30s.',
      '{singer,band,acoustic,dj}','51.4700','-2.5900'),
    jsonb_build_array('tynebridge@demo.gigly.invalid','Chris Dunn','Tyne Bridge Social','club','14 Quayside','Newcastle upon Tyne','NE1 3DE',
      'Quayside club over two floors, 320 capacity. DJs and live PA Friday and Saturday, plus a Sunday session downstairs.',
      '{dj,band,drag}','54.9700','-1.6000'),
    jsonb_build_array('glasgowarms@demo.gigly.invalid','Iona Fraser','The Sauchiehall Arms','pub','221 Sauchiehall Street','Glasgow','G2 3EX',
      'City-centre pub with a long history of live music. Small stage, big crowd, and an audience that genuinely listens.',
      '{band,singer,acoustic,comedian}','55.8650','-4.2650'),
    jsonb_build_array('cardiffbay@demo.gigly.invalid','Rhys Bevan','Bay View Hotel','hotel','8 Mermaid Quay','Cardiff','CF10 5BZ',
      'Waterfront hotel with a function suite for 180 and a bar that runs a Sunday residency. Weddings most Saturdays through summer.',
      '{singer,acoustic,band,dj}','51.4640','-3.1650'),
    jsonb_build_array('sheffsteel@demo.gigly.invalid','Dawn Whitaker','Steelworks','event_company','Unit 12, Kelham Island','Sheffield','S3 8SD',
      'Events in converted industrial spaces across South Yorkshire. Corporate parties, weddings, and a monthly warehouse night.',
      '{dj,band,drag,dancer}','53.3900','-1.4700'),
    jsonb_build_array('nottsrock@demo.gigly.invalid','Marcus Oyelaran','The Rock House','club','44 Talbot Street','Nottingham','NG1 5GL',
      'Independent live venue, 250 capacity, six nights a week. Rock, indie, punk. We pay on the night, always.',
      '{band,dj}','52.9550','-1.1550'),
    jsonb_build_array('brightonpier@demo.gigly.invalid','Suki Lambert','The Lanes Tavern','pub','3 Meeting House Lane','Brighton','BN1 1HB',
      'Tiny pub in The Lanes with an outsized reputation for live music. Acoustic sets midweek, full bands at the weekend.',
      '{acoustic,singer,band,drag}','50.8220','-0.1420'),
    jsonb_build_array('leicesterhall@demo.gigly.invalid','Amara Singh','Belgrave Banqueting','event_company','180 Belgrave Road','Leicester','LE4 5AT',
      'Banqueting hall for weddings and celebrations, up to 400 guests. We book bands, DJs and dancers year round.',
      '{band,dj,dancer,singer}','52.6480','-1.1200')
  );
  -- act email, real name, stage name, bio, categories, price(pence), radius,
  -- event types, location text, lat, lng
  acts constant jsonb := jsonb_build_array(
    jsonb_build_array('jess@demo.gigly.invalid','Jess Corrigan','Jess Corrigan',
      'Festival-ready pop and soul with a five-piece. Two 45s or one long set. We have played every county show in the South West and know how to hold a field.',
      '{singer,band}','48000','75','{festival,wedding,corporate,private}','Bristol, Bristol','51.4545','-2.5879'),
    jsonb_build_array('tommy@demo.gigly.invalid','Tommy Reid','Tommy Reid',
      'Geordie stand-up, twenty years in. Clubs, corporates and cruise ships. Clean set or late-night, your call — I will ask before I swear.',
      '{comedian}','30000','120','{club,pub,corporate,holiday_park}','Newcastle upon Tyne, North East','54.9783','-1.6178'),
    jsonb_build_array('cara@demo.gigly.invalid','Cara MacLeod','Cara & The Coast',
      'Scottish folk-pop trio. Fiddle, guitar, three-part harmony. Ceilidh sets on request, and we can play unamplified for smaller rooms.',
      '{band,acoustic}','40000','90','{wedding,pub,festival,private}','Glasgow, Glasgow City','55.8642','-4.2518'),
    jsonb_build_array('raj@demo.gigly.invalid','Raj Chaudhry','DJ Rajj',
      'Bhangra, Bollywood and open-format. Weddings a speciality — I have done over 200 and I know exactly when to bring the dhol in.',
      '{dj}','45000','150','{wedding,club,private,corporate}','Leicester, Leicester','52.6369','-1.1398'),
    jsonb_build_array('nina@demo.gigly.invalid','Nina Okonkwo','Nina O',
      'Jazz and soul vocalist with a trio or to backing tracks. Hotel bars, private dining, drinks receptions. Repertoire from Ella to Amy.',
      '{singer,acoustic}','32000','60','{hotel,corporate,wedding,private}','Cardiff, Cardiff','51.4816','-3.1791'),
    jsonb_build_array('dex@demo.gigly.invalid','Dexter Poole','Dex & The Deltas',
      'Blues and rock and roll, four-piece, all original gear. If you want the room dancing by the second song, this is the band.',
      '{band}','42000','80','{pub,club,festival,private}','Sheffield, Sheffield','53.3811','-1.4701'),
    jsonb_build_array('ollie@demo.gigly.invalid','Ollie Grant','Oasis Reimagined',
      'Oasis tribute, five-piece, note for note. Full show with lighting, or a straight 90-minute set. Booked at 40 holiday parks last season.',
      '{tribute,band}','60000','120','{holiday_park,club,festival,pub}','Nottingham, Nottingham','52.9548','-1.1581'),
    jsonb_build_array('fay@demo.gigly.invalid','Fay Ellison','Fay Ellison',
      'Solo acoustic — guitar, loop pedal, and a voice people stop talking for. Coastal pubs, weddings, and anywhere that needs two hours of proper songs.',
      '{acoustic,singer}','22000','45','{pub,wedding,hotel,private}','Brighton, Brighton and Hove','50.8225','-0.1372'),
    jsonb_build_array('george@demo.gigly.invalid','George Ashworth','The Ashworth Swing Band',
      'Nine-piece swing band in full dinner suits. Glenn Miller through to Robbie. We bring our own risers and a singer who can work a room.',
      '{band,singer}','95000','100','{wedding,corporate,hotel,festival}','Manchester, Manchester','53.4808','-2.2426'),
    jsonb_build_array('sasha@demo.gigly.invalid','Sasha Vane','Sasha Vane',
      'Aerial and fire performance for events that want something people photograph. Full rigging spec supplied; I work with your venue on safety.',
      '{dancer,other}','55000','200','{corporate,festival,private,club}','London, Greater London','51.5074','-0.1278')
  );
begin
  if not exists (select 1 from auth.users where email like '%@demo.gigly.invalid') then
    return; -- nothing to extend
  end if;

  -- ------------------------------------------------------------- venues ---
  for rec in select * from jsonb_array_elements(venues) as t(v) loop
    if exists (select 1 from auth.users where email = rec.v ->> 0) then continue; end if;

    u := public.demo_create_user(rec.v ->> 0, rec.v ->> 1, 'venue');

    insert into public.venue_profiles
      (user_id, venue_name, venue_type, address_line_1, city, postcode, description, entertainment_preferences)
    values
      (u, rec.v ->> 2, (rec.v ->> 3)::public.venue_type, rec.v ->> 4, rec.v ->> 5, rec.v ->> 6,
       rec.v ->> 7, (rec.v ->> 8)::text[]);

    update public.profiles
       set location_text = (rec.v ->> 5) || ', UK',
           location_lat = (rec.v ->> 9)::numeric,
           location_lng = (rec.v ->> 10)::numeric,
           onboarding_complete = true
     where id = u;
  end loop;

  -- --------------------------------------------------------------- acts ---
  for rec in select * from jsonb_array_elements(acts) as t(a) loop
    if exists (select 1 from auth.users where email = rec.a ->> 0) then continue; end if;

    u := public.demo_create_user(rec.a ->> 0, rec.a ->> 1, 'entertainer');

    insert into public.entertainer_profiles
      (user_id, stage_name, bio, categories, starting_price, travel_radius_miles,
       event_types, media_links, profile_completeness)
    values
      (u, rec.a ->> 2, rec.a ->> 3, (rec.a ->> 4)::text[], (rec.a ->> 5)::integer,
       (rec.a ->> 6)::integer, (rec.a ->> 7)::text[], '[]'::jsonb, 85);

    update public.profiles
       set location_text = rec.a ->> 8,
           location_lat = (rec.a ->> 9)::numeric,
           location_lng = (rec.a ->> 10)::numeric,
           onboarding_complete = true
     where id = u;
  end loop;

  -- --------------------------------------------------------------- gigs ---
  -- One or two per new venue, spread across the next eight weeks.
  for rec in
    select v.id, v.venue_name, v.city, p.location_lat, p.location_lng
      from public.venue_profiles v
      join public.profiles p on p.id = v.user_id
      join public.profile_private pp on pp.user_id = v.user_id
     where pp.email in (
       'crownbristol@demo.gigly.invalid','tynebridge@demo.gigly.invalid',
       'glasgowarms@demo.gigly.invalid','cardiffbay@demo.gigly.invalid',
       'sheffsteel@demo.gigly.invalid','nottsrock@demo.gigly.invalid',
       'brightonpier@demo.gigly.invalid','leicesterhall@demo.gigly.invalid')
  loop
    -- Skip if this venue already has listings, so a re-run adds nothing.
    if exists (select 1 from public.gigs where venue_id = rec.id) then continue; end if;

    insert into public.gigs
      (venue_id, title, category, description, date, start_time, end_time,
       location_text, location_lat, location_lng, budget_min, budget_max,
       audience_size, requirements, inclusions, is_urgent, visibility)
    values
      (rec.id,
       'Saturday live music — ' || rec.city,
       'band',
       'Our regular Saturday slot. Two sets, covers and crowd-pleasers. Busy room, good sound, and we pay on the night without being chased.',
       current_date + 7 + (random() * 21)::int, '21:00', '23:30',
       rec.city || ', UK', rec.location_lat, rec.location_lng,
       35000, 45000, '100–200', 'Two 45-minute sets. Own instruments.',
       'PA, lights, engineer, parking, food and drinks.', false, 'published'),
      (rec.id,
       'Midweek acoustic session — ' || rec.venue_name,
       'acoustic',
       'Relaxed midweek session, 7 to 9pm. Solo or duo, singalong-friendly. Regular slot for the right act.',
       current_date + 4 + (random() * 24)::int, '19:00', '21:00',
       rec.city || ', UK', rec.location_lat, rec.location_lng,
       15000, 20000, '40–70', 'Bring your own guitar. Small PA provided.',
       'PA, meal, tab behind the bar.', false, 'published');
  end loop;

  -- A couple of urgent ones, because that is what the flag is for.
  update public.gigs
     set is_urgent = true, date = current_date + 3
   where id in (
     select g.id from public.gigs g
       join public.venue_profiles v on v.id = g.venue_id
       join public.profile_private pp on pp.user_id = v.user_id
      where pp.email in ('nottsrock@demo.gigly.invalid','tynebridge@demo.gigly.invalid')
        and g.category = 'band'
      limit 2
   );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Fold both into the main seed, and apply them to what is already loaded
-- ---------------------------------------------------------------------------
create or replace function public.seed_demo_data_extras()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  perform public.seed_demo_extra();
  perform public.seed_demo_media();
  return 'extended';
end;
$fn$;

grant execute on function public.seed_demo_data_extras to authenticated;
revoke execute on function public.seed_demo_extra from public, anon, authenticated;
revoke execute on function public.seed_demo_media from public, anon, authenticated;

-- Apply to the currently-loaded demo set. Both are no-ops on an empty database.
select public.seed_demo_extra();
select public.seed_demo_media();
