# GIGLY

Marketplace connecting entertainers with venues. Next.js 16 · Supabase · Tailwind 4 · Vercel.

The full specification is `docs/GIGLY_Project_Build_Plan.docx`. Section numbers
referenced in code comments point at that document.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in from Supabase → Settings → API
npm run dev
```

## Database

The schema lives in `supabase/migrations/`, six files, applied in filename order:

| File | Contents |
|---|---|
| `…_extensions_and_enums.sql` | PostGIS, every enum, the shared `updated_at` trigger |
| `…_profiles.sql` | `profiles`, `entertainer_profiles`, `venue_profiles`, auth sync triggers |
| `…_gigs_applications_bookings.sql` | The core marketplace loop |
| `…_availability_messaging.sql` | Diary, conversations, messages, realtime |
| `…_reviews_notifications.sql` | Reputation and the notification centre |
| `…_rls_policies.sql` | Row-level security — the entire authorisation layer |

Apply them:

```bash
npx supabase login
npx supabase link --project-ref loklokibqsazuswrcffw
npx supabase db push
```

Then regenerate the TypeScript types, which are a hand-written placeholder until
you do:

```bash
npx supabase gen types typescript --project-id loklokibqsazuswrcffw > src/lib/types/database.ts
```

### Deviations from the specification

The schema follows Section 4 with eight deliberate changes, each commented at
the point it occurs:

1. **`role` column** — Section 4 has no admin role, but Week 9 needs one. Kept
   separate from `account_type`, which the spec says is immutable.
2. **`applications` unique on `(gig_id, entertainer_id)`** — the spec prevents
   duplicate applications in application code; a double-clicked button beats
   application code.
3. **`conversations` canonical participant ordering** — otherwise `(a,b)` and
   `(b,a)` are two threads and messages appear to vanish.
4. **`availability` unique on `(entertainer_id, date, time_slot)`** — without
   it a slot can be both `available` and `booked`.
5. **Generated `geography` columns** on `profiles` and `gigs` — plain
   lat/lng decimals cannot use a spatial index, so distance search would scan
   every row.
6. **`reviews.text` → `reviews.body`** — `text` is also a type name.
7. **`profiles.email` kept but trigger-synced** — the spec's "synced from
   auth.users" had no mechanism.
8. **`public_profiles` view** — profiles holds email and phone, so the table is
   private to its owner and this view carries the publicly safe columns.

## Security model

There is no API server (Section 2.1) — the browser talks to Postgres directly.
The RLS policies in `supabase/migrations/*_rls_policies.sql` are therefore the
only thing standing between a user and everyone else's data. Any new table needs
`enable row level security` plus policies in the same migration that creates it.

`SUPABASE_SERVICE_ROLE_KEY` bypasses all of it. It is server-side only and must
never gain a `NEXT_PUBLIC_` prefix.

## Build status

Week 1 (Foundation) is complete: splash page, account-type selection, signup for
both roles, login, logout, password reset, and role-based routing enforced in
`src/proxy.ts`.

Week 2 (Profiles) is next.
