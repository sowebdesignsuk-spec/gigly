-- ============================================================================
-- Demo data — loaded and removed from /admin, never from a migration
--
-- Creates real auth users (so both sides of the marketplace can be driven by
-- logging in), profiles across five UK cities, gigs, applications in every
-- status, a confirmed booking, a completed booking with reviews, and a message
-- thread. Every demo account shares one password and an @demo.gigly.invalid
-- address, which is what remove_demo_data() keys on.
--
-- Both functions are admin-only and idempotent: loading twice is a no-op,
-- removing when nothing is loaded is a no-op.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create or replace function public.demo_password()
returns text
language sql
immutable
as $fn$ select 'gigly-demo'::text; $fn$;

-- Inserts one auth user the way GoTrue expects to find it, and returns the id.
-- The handle_new_user trigger then creates profiles and profile_private.
create or replace function public.demo_create_user(
  p_email text, p_name text, p_type public.account_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, extensions.crypt(public.demo_password(), extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('account_type', p_type, 'full_name', p_name),
    now(), now(), '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid::text, uid,
    jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return uid;
end;
$fn$;

create or replace function public.seed_demo_data()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  -- venues
  v_dog uuid; v_hut uuid; v_gran uuid; v_park uuid; v_ev uuid;
  vp_dog uuid; vp_hut uuid; vp_gran uuid; vp_park uuid; vp_ev uuid;
  -- entertainers
  e_ruby uuid; e_neon uuid; e_kyle uuid; e_soul uuid; e_maria uuid; e_deck uuid; e_stan uuid; e_lila uuid;
  ep_ruby uuid; ep_neon uuid; ep_kyle uuid; ep_soul uuid; ep_maria uuid; ep_deck uuid; ep_stan uuid; ep_lila uuid;
  -- gigs
  g1 uuid; g2 uuid; g3 uuid; g4 uuid; g5 uuid; g6 uuid; g7 uuid; g8 uuid; g_past uuid;
  a_accept uuid; a_past uuid;
  b_past uuid;
  conv uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if exists (select 1 from auth.users where email like '%@demo.gigly.invalid') then
    return 'already loaded';
  end if;

  -- ------------------------------------------------------------- venues ---
  v_dog  := public.demo_create_user('dogandduck@demo.gigly.invalid', 'Sam Okafor',    'venue');
  v_hut  := public.demo_create_user('nightshift@demo.gigly.invalid', 'Priya Nair',    'venue');
  v_gran := public.demo_create_user('grandhotel@demo.gigly.invalid', 'Marcus Webb',   'venue');
  v_park := public.demo_create_user('seabreeze@demo.gigly.invalid',  'Jo Hartley',    'venue');
  v_ev   := public.demo_create_user('bigtop@demo.gigly.invalid',     'Dee Campbell',  'venue');

  insert into public.venue_profiles (user_id, venue_name, venue_type, address_line_1, city, postcode, description, entertainment_preferences, website_url)
  values
    (v_dog,  'The Dog & Duck',        'pub',           '14 Oldham Street',        'Manchester', 'M1 1JQ',
     'Corner pub in the Northern Quarter with a proper stage and a crowd that actually listens. Live music every Friday and Saturday, capacity 120, PA and lights in.',
     '{singer,band,acoustic,tribute}', 'https://example.com/dogandduck'),
    (v_hut,  'Nightshift',            'club',          '9 Digbeth High Street',   'Birmingham', 'B5 6DY',
     'Late-licence club, two rooms, 400 capacity. We book DJs and live PA acts Thursday to Saturday. Full rig, sound engineer on the night.',
     '{dj,band,drag}', null),
    (v_gran, 'The Grand Hotel',       'hotel',         '1 Headrow',               'Leeds',      'LS1 8TL',
     'Four-star city hotel. Function suite seats 200 for weddings and corporate dinners; the bar has a residency slot every Sunday afternoon.',
     '{singer,acoustic,band,comedian}', 'https://example.com/grand'),
    (v_park, 'Sea Breeze Holiday Park','holiday_park', 'Coast Road',              'Liverpool',  'L23 8SY',
     'Family holiday park with a 350-seat entertainment lounge. Seven nights a week through summer — tribute acts, singers, comedians, kids'' shows.',
     '{tribute,singer,comedian,dancer}', null),
    (v_ev,   'Big Top Events',        'event_company', 'Unit 4, Bermondsey Works','London',     'SE1 3UN',
     'Corporate and private events across London and the South East. We book everything from string quartets to drag brunches. Fees are firm and paid on the night.',
     '{band,dj,drag,comedian,dancer}', 'https://example.com/bigtop');

  update public.profiles set location_text = 'Manchester, UK', location_lat = 53.4831, location_lng = -2.2350, onboarding_complete = true where id = v_dog;
  update public.profiles set location_text = 'Birmingham, UK', location_lat = 52.4751, location_lng = -1.8836, onboarding_complete = true where id = v_hut;
  update public.profiles set location_text = 'Leeds, UK',      location_lat = 53.7997, location_lng = -1.5436, onboarding_complete = true where id = v_gran;
  update public.profiles set location_text = 'Liverpool, UK',  location_lat = 53.4808, location_lng = -3.0310, onboarding_complete = true where id = v_park;
  update public.profiles set location_text = 'London, UK',     location_lat = 51.4980, location_lng = -0.0760, onboarding_complete = true where id = v_ev;

  select id into vp_dog  from public.venue_profiles where user_id = v_dog;
  select id into vp_hut  from public.venue_profiles where user_id = v_hut;
  select id into vp_gran from public.venue_profiles where user_id = v_gran;
  select id into vp_park from public.venue_profiles where user_id = v_park;
  select id into vp_ev   from public.venue_profiles where user_id = v_ev;

  -- ------------------------------------------------------- entertainers ---
  e_ruby  := public.demo_create_user('ruby@demo.gigly.invalid',   'Ruby Alvarez',   'entertainer');
  e_neon  := public.demo_create_user('neon@demo.gigly.invalid',   'Tom Hesketh',    'entertainer');
  e_kyle  := public.demo_create_user('kyle@demo.gigly.invalid',   'Kyle Brennan',   'entertainer');
  e_soul  := public.demo_create_user('soul@demo.gigly.invalid',   'Grace Adeyemi',  'entertainer');
  e_maria := public.demo_create_user('maria@demo.gigly.invalid',  'Maria Kowalski', 'entertainer');
  e_deck  := public.demo_create_user('deck@demo.gigly.invalid',   'Ash Patel',      'entertainer');
  e_stan  := public.demo_create_user('stan@demo.gigly.invalid',   'Stan Fielding',  'entertainer');
  e_lila  := public.demo_create_user('lila@demo.gigly.invalid',   'Lila Moreau',    'entertainer');

  insert into public.entertainer_profiles (user_id, stage_name, bio, categories, starting_price, travel_radius_miles, event_types, media_links, profile_completeness)
  values
    (e_ruby,  'Ruby Alvarez',        'Soul and Motown vocalist with a four-piece band or solo to backing tracks. Two 45-minute sets, floor-filler guaranteed. Ten years on the circuit, from working men''s clubs to the Hilton.',
     '{singer,band}', 35000, 40, '{pub,hotel,wedding,corporate}', '[{"type":"youtube","url":"https://youtube.com/@rubyalvarez"},{"type":"spotify","url":"https://open.spotify.com/artist/demo"}]', 96),
    (e_neon,  'Neon Wolves',         'Indie and rock covers — Arctic Monkeys to The Killers, played loud and tight. Own PA for rooms up to 200. We turn up on time and we don''t do requests for Wonderwall.',
     '{band}', 45000, 60, '{pub,club,festival,private}', '[{"type":"youtube","url":"https://youtube.com/@neonwolves"},{"type":"instagram","url":"https://instagram.com/neonwolves"}]', 88),
    (e_kyle,  'Kyle Brennan',        'Stand-up. Twelve years, Edinburgh three times, clean or filthy to order. Twenty minutes to an hour. Compère work too.',
     '{comedian}', 25000, 100, '{pub,club,hotel,corporate,holiday_park}', '[{"type":"youtube","url":"https://youtube.com/@kylebrennan"}]', 80),
    (e_soul,  'Amy Winehouse by Grace','Tribute to Amy — the voice, the beehive, the band. Full 90-minute show or a 45-minute set. Booked solid through summer at holiday parks across the North West.',
     '{tribute,singer}', 55000, 80, '{holiday_park,club,festival,private}', '[{"type":"youtube","url":"https://youtube.com/@amybygrace"},{"type":"instagram","url":"https://instagram.com/amybygrace"}]', 92),
    (e_maria, 'Maria K Acoustic',    'Acoustic guitar and vocals for bars, weddings and afternoons that need a soundtrack. Ed Sheeran to Fleetwood Mac. Two hours, no PA needed under 80 people.',
     '{acoustic,singer}', 18000, 30, '{pub,hotel,wedding,private}', '[{"type":"soundcloud","url":"https://soundcloud.com/mariak"}]', 84),
    (e_deck,  'DJ Deck Patel',       'Open-format DJ — house, garage, RnB, 90s, whatever the room wants. Club residencies in Birmingham and Leicester; weddings and corporates on request. Own rig for up to 300.',
     '{dj}', 30000, 70, '{club,wedding,corporate,private}', '[{"type":"soundcloud","url":"https://soundcloud.com/deckpatel"},{"type":"instagram","url":"https://instagram.com/deckpatel"}]', 90),
    (e_stan,  'Stan Fielding',       'Crooner. Sinatra, Bublé, Dean Martin. Sunday afternoons, hotel bars, anniversaries. Dinner suit, own backing tracks, will chat to your nan.',
     '{singer}', 20000, 50, '{hotel,wedding,private,holiday_park}', '[]', 60),
    (e_lila,  'Miss Lila Fontaine',  'Drag cabaret and brunch host. Lip-sync, live vocals, bingo, crowd work. Two hours of chaos, tastefully done. Available across London and the South East.',
     '{drag,singer}', 40000, 45, '{club,corporate,private}', '[{"type":"instagram","url":"https://instagram.com/misslilafontaine"},{"type":"youtube","url":"https://youtube.com/@lilafontaine"}]', 94);

  update public.profiles set location_text = 'Manchester, UK', location_lat = 53.4700, location_lng = -2.2500, onboarding_complete = true where id = e_ruby;
  update public.profiles set location_text = 'Stockport, UK',  location_lat = 53.4084, location_lng = -2.1493, onboarding_complete = true where id = e_neon;
  update public.profiles set location_text = 'Leeds, UK',      location_lat = 53.8008, location_lng = -1.5491, onboarding_complete = true where id = e_kyle;
  update public.profiles set location_text = 'Wigan, UK',      location_lat = 53.5450, location_lng = -2.6325, onboarding_complete = true where id = e_soul;
  update public.profiles set location_text = 'Salford, UK',    location_lat = 53.4875, location_lng = -2.2901, onboarding_complete = true where id = e_maria;
  update public.profiles set location_text = 'Birmingham, UK', location_lat = 52.4862, location_lng = -1.8904, onboarding_complete = true where id = e_deck;
  update public.profiles set location_text = 'Harrogate, UK',  location_lat = 53.9921, location_lng = -1.5418, onboarding_complete = true where id = e_stan;
  update public.profiles set location_text = 'London, UK',     location_lat = 51.5074, location_lng = -0.1278, onboarding_complete = true where id = e_lila;

  select id into ep_ruby  from public.entertainer_profiles where user_id = e_ruby;
  select id into ep_neon  from public.entertainer_profiles where user_id = e_neon;
  select id into ep_kyle  from public.entertainer_profiles where user_id = e_kyle;
  select id into ep_soul  from public.entertainer_profiles where user_id = e_soul;
  select id into ep_maria from public.entertainer_profiles where user_id = e_maria;
  select id into ep_deck  from public.entertainer_profiles where user_id = e_deck;
  select id into ep_stan  from public.entertainer_profiles where user_id = e_stan;
  select id into ep_lila  from public.entertainer_profiles where user_id = e_lila;

  -- --------------------------------------------------------------- gigs ---
  insert into public.gigs (id, venue_id, title, category, description, date, start_time, end_time, location_text, location_lat, location_lng, budget_min, budget_max, audience_size, requirements, inclusions, is_urgent, visibility)
  values
    (gen_random_uuid(), vp_dog, 'Saturday night covers band — 2 x 45 min sets', 'band',
     'Busy Saturday crowd, mostly 30–50, up for a dance. Looking for a band who can fill the floor from 9pm. Rock, indie, pop covers all welcome; keep it loud and keep it moving.',
     current_date + 9, '21:00', '23:30', 'Manchester, UK', 53.4831, -2.2350, 40000, 50000, '100–120', 'Own instruments. No backing tracks. Two 45-minute sets with a break.', 'Full PA and lights, sound engineer, parking behind the pub, food and drinks on the night.', false, 'published'),
    (gen_random_uuid(), vp_dog, 'Friday acoustic — early evening set', 'acoustic',
     'Chilled Friday early doors, 6 to 8pm. Solo acoustic act, singalong-friendly covers. Regular slot if it works.',
     current_date + 8, '18:00', '20:00', 'Manchester, UK', 53.4831, -2.2350, 15000, null, '40–60', 'Bring your own guitar. Small PA provided.', 'PA, a meal, tab at the bar.', false, 'published'),
    (gen_random_uuid(), vp_hut, 'URGENT: Saturday headline DJ — cancellation', 'dj',
     'Our booked DJ has dropped out. Need an open-format DJ for the main room, 11pm to 3am, this Saturday. House, garage, RnB. Rig and engineer in place, you bring USBs.',
     current_date + 3, '23:00', '03:00', 'Birmingham, UK', 52.4751, -1.8836, 35000, 45000, '350–400', 'Pioneer CDJ-3000 / DJM-A9 in place. Own headphones and USBs.', 'Full rig, engineer, rider, taxi home within 15 miles.', true, 'published'),
    (gen_random_uuid(), vp_gran, 'Sunday afternoon residency — bar singer', 'singer',
     'Looking for a regular Sunday afternoon act for the hotel bar, 3 to 5pm. Easy listening, swing, standards. Older crowd, families, afternoon tea. Could become a monthly residency.',
     current_date + 10, '15:00', '17:00', 'Leeds, UK', 53.7997, -1.5436, 20000, 25000, '60–80', 'Smart dress. Own backing tracks or unamplified piano available.', 'Small PA, baby grand, afternoon tea, parking.', false, 'published'),
    (gen_random_uuid(), vp_gran, 'Corporate awards dinner — comedian and compère', 'comedian',
     'Annual awards for a regional law firm. 180 seated. Need a compère for the awards (45 min) plus a 20-minute clean set after dinner. Corporate-safe material only.',
     current_date + 21, '19:30', '22:30', 'Leeds, UK', 53.7997, -1.5436, 60000, 80000, '180', 'Clean material. Dinner suit. Arrive 6pm for a run-through.', 'PA, lapel mic, dinner, accommodation if travelling over 50 miles.', false, 'published'),
    (gen_random_uuid(), vp_park, 'Amy Winehouse tribute — Friday showbar', 'tribute',
     'Peak-season showbar slot. 350 seats, family audience till 9 then adults. 90-minute tribute show with a break. We''ve had Elvis, Queen and Take That this season — Amy''s the most requested.',
     current_date + 15, '20:30', '22:30', 'Liverpool, UK', 53.4808, -3.0310, 55000, null, '300–350', 'Full show, costume, own band or tracks. Family-friendly language before 9pm.', 'Full stage, PA, lights, tech, dressing room, meal, caravan overnight if needed.', false, 'published'),
    (gen_random_uuid(), vp_park, 'Kids'' afternoon entertainer — school holidays', 'other',
     'Weekday afternoons through the holidays. Magic, balloons, games, anything that holds 80 under-tens for an hour. Repeat bookings for the right act.',
     current_date + 12, '14:00', '15:00', 'Liverpool, UK', 53.4808, -3.0310, 12000, 15000, '60–80 children', 'DBS checked. Own props.', 'Stage, PA, drinks, parking.', false, 'published'),
    (gen_random_uuid(), vp_ev, 'Drag brunch host — Shoreditch, Saturday', 'drag',
     'Two-hour bottomless brunch for a hen group of 40 plus walk-ins. Host, two numbers, bingo round, crowd work. This client books monthly if it lands.',
     current_date + 6, '12:30', '14:30', 'London, UK', 51.5240, -0.0790, 40000, 50000, '60–80', 'Two numbers minimum. Radio mic provided. Keep it cheeky not filthy — it''s daytime.', 'PA, radio mic, changing room, brunch, cab within zone 2.', false, 'published'),
    -- A draft the venue is still writing.
    (gen_random_uuid(), vp_ev, 'Wedding band — Surrey barn, September', 'band',
     'Barn wedding, 140 guests, evening reception. First dance, then two sets of party covers. Details to follow once the couple confirm.',
     current_date + 40, '20:00', '00:00', 'London, UK', 51.5074, -0.1278, 120000, 150000, '140', null, null, false, 'draft'),
    -- A gig in the past, for the completed booking and reviews.
    (gen_random_uuid(), vp_dog, 'Soul night — Ruby Alvarez Band', 'singer',
     'One-off soul and Motown night. Done and dusted.',
     current_date - 12, '21:00', '23:30', 'Manchester, UK', 53.4831, -2.2350, 35000, null, '110', null, 'PA, lights, food.', false, 'closed');

  select id into g1 from public.gigs where title like 'Saturday night covers band%';
  select id into g2 from public.gigs where title like 'Friday acoustic%';
  select id into g3 from public.gigs where title like 'URGENT: Saturday headline DJ%';
  select id into g4 from public.gigs where title like 'Sunday afternoon residency%';
  select id into g5 from public.gigs where title like 'Corporate awards dinner%';
  select id into g6 from public.gigs where title like 'Amy Winehouse tribute%';
  select id into g7 from public.gigs where title like 'Kids'' afternoon%';
  select id into g8 from public.gigs where title like 'Drag brunch host%';
  select id into g_past from public.gigs where title like 'Soul night%';

  -- ------------------------------------------------------- applications ---
  -- Every status represented, so the venue and entertainer views have
  -- something to show in each state.
  insert into public.applications (gig_id, entertainer_id, message, proposed_fee, status, viewed_at) values
    (g1, ep_neon, 'We play the Dog & Duck kind of room every weekend — loud, tight, two sets, own PA if yours is down. Happy at the advertised fee.', 45000, 'shortlisted', now() - interval '2 days'),
    (g1, ep_ruby, 'Soul and Motown with a four-piece rather than rock, but the floor will be full. Can do it for £400.', 40000, 'viewed', now() - interval '1 day'),
    (g2, ep_maria, 'This is exactly my slot. Two hours of singalong acoustic, no PA needed under 80. Would love it to be a regular.', null, 'sent', null),
    (g3, ep_deck, 'Available Saturday. Open format is what I do — CDJ-3000s are my home setup. Can be there for 10pm soundcheck.', 40000, 'offered', now() - interval '3 hours'),
    (g4, ep_stan, 'Sunday afternoon standards for a hotel bar is the job I was built for. Backing tracks or the baby grand, your call.', 22000, 'sent', null),
    (g4, ep_ruby, 'Can do an easy-listening set — Etta James, Carole King, Nina Simone. Solo to tracks.', 25000, 'sent', null),
    (g5, ep_kyle, 'Clean corporate compère and 20 minutes is my bread and butter. Law firm awards last month in Sheffield went down well — happy to send a clip.', 70000, 'sent', null),
    (g6, ep_soul, 'Peak-season showbar is where the show lives. 90 minutes, full costume, family-safe till 9. Sea Breeze had me two summers ago.', null, 'sent', null),
    (g8, ep_lila, 'Hen brunches are my specialist subject. Two numbers, bingo, crowd work, cheeky not filthy — I know the daytime rules.', 45000, 'sent', null),
    -- One that was declined, one withdrawn.
    (g3, ep_neon, 'Not really a DJ but we could do a live set?', 45000, 'declined', now() - interval '5 hours'),
    (g5, ep_stan, 'Could do a crooner set between courses?', 20000, 'withdrawn', now() - interval '1 day');

  -- Ruby played the soul night: accept her application there, which fires the
  -- booking trigger, then age the booking to completed and add the reviews.
  insert into public.applications (gig_id, entertainer_id, message, proposed_fee, status, viewed_at)
  values (g_past, ep_ruby, 'Soul night with the full band. Let''s go.', 35000, 'offered', now() - interval '20 days')
  returning id into a_past;

  update public.applications set status = 'accepted' where id = a_past;
  select id into b_past from public.bookings where application_id = a_past;
  update public.bookings set status = 'completed' where id = b_past;

  insert into public.reviews (booking_id, reviewer_id, reviewed_user_id, rating, body) values
    (b_past, v_dog,  e_ruby, 5, 'Packed the place and kept it packed. Band was tight, Ruby was a star, and they were set up and ready before the doors opened. Booking again.'),
    (b_past, e_ruby, v_dog,  5, 'Lovely room, proper sound, paid on the night without being asked. The kind of venue that makes the circuit worth it.');

  -- A confirmed future booking too: Deck accepts the urgent Nightshift offer.
  select id into a_accept from public.applications where gig_id = g3 and entertainer_id = ep_deck;
  update public.applications set status = 'accepted' where id = a_accept;

  -- ------------------------------------------------------- availability ---
  insert into public.availability (entertainer_id, date, time_slot, status, notes) values
    (ep_ruby,  current_date + 5,  'all_day', 'unavailable', 'Family'),
    (ep_ruby,  current_date + 16, 'all_day', 'held',        'Pencilled for a wedding in Cheshire'),
    (ep_neon,  current_date + 9,  'all_day', 'held',        'Dog & Duck, waiting on offer'),
    (ep_soul,  current_date + 15, 'all_day', 'held',        'Sea Breeze showbar — applied'),
    (ep_soul,  current_date + 22, 'all_day', 'unavailable', null),
    (ep_maria, current_date + 8,  'evening', 'available',   null),
    (ep_stan,  current_date + 10, 'afternoon','available',  null)
  on conflict do nothing;

  -- ------------------------------------------------------------ messages ---
  -- A thread between the Dog & Duck and Neon Wolves about the Saturday gig.
  insert into public.conversations (participant_1, participant_2, gig_id)
  values (least(v_dog, e_neon), greatest(v_dog, e_neon), g1)
  returning id into conv;

  insert into public.messages (conversation_id, sender_id, body, created_at, read_at) values
    (conv, v_dog,  'Hi — shortlisted you for Saturday. Do you have a set list you could send over?', now() - interval '26 hours', now() - interval '25 hours'),
    (conv, e_neon, 'Cheers! Roughly: Arctic Monkeys, Killers, Kings of Leon, Stereophonics, a bit of Blur, finish on Mr Brightside. Can shift it towards whatever your crowd likes.', now() - interval '25 hours', now() - interval '20 hours'),
    (conv, v_dog,  'That''s spot on. Can you do 9pm start rather than 9:30? Football finishes at 8.', now() - interval '20 hours', now() - interval '19 hours'),
    (conv, e_neon, '9pm is fine. We''ll load in from 7.', now() - interval '19 hours', null);

  return 'loaded';
end;
$fn$;

create or replace function public.remove_demo_data()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  demo_ids uuid[];
  n integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select array_agg(id) into demo_ids from auth.users where email like '%@demo.gigly.invalid';
  if demo_ids is null then
    return 'nothing loaded';
  end if;

  -- Bookings are ON DELETE RESTRICT, so they go first, along with anything
  -- hanging off them. Every demo booking is between two demo users.
  delete from public.reviews r using public.bookings b
   where r.booking_id = b.id
     and (b.venue_id in (select id from public.venue_profiles where user_id = any(demo_ids))
       or b.entertainer_id in (select id from public.entertainer_profiles where user_id = any(demo_ids)));

  delete from public.bookings b
   where b.venue_id in (select id from public.venue_profiles where user_id = any(demo_ids))
      or b.entertainer_id in (select id from public.entertainer_profiles where user_id = any(demo_ids));

  delete from auth.users where id = any(demo_ids);
  get diagnostics n = row_count;

  return 'removed ' || n || ' accounts';
end;
$fn$;

grant execute on function public.seed_demo_data   to authenticated;
grant execute on function public.remove_demo_data to authenticated;
revoke execute on function public.demo_create_user from public, anon, authenticated;
