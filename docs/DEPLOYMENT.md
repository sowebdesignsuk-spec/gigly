# GIGLY — deployment and handover

Section 5, Week 9.9: "Write deployment documentation and developer handover
notes." This is the operational side; the product spec is
`GIGLY_Project_Build_Plan.docx` in this folder and the schema rationale is in
the root `README.md`.

## The moving parts

| Piece | Where | What it does |
|---|---|---|
| Code | github.com/sowebdesignsuk-spec/gigly, branch `main` | Every push deploys |
| Hosting | Vercel project `gigly` | Builds and serves the Next.js app |
| Database, auth, storage | Supabase project `loklokibqsazuswrcffw` (London) | Everything stateful |
| Geocoding | postcodes.io | Free, keyless, no account |

There is no separate API server. The browser talks to Supabase directly and
row-level security is the authorisation layer.

## Deploying

Push to `main`. Vercel builds it. That is the whole procedure.

A pull request gets its own preview URL. Auth on previews works because the
Supabase redirect allow-list includes `https://*-sowebdesignsuk-spec.vercel.app/**`.

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Where it comes from | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (publishable key) | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret key) | **Not set yet.** Add only when something server-side needs to bypass RLS. Never `NEXT_PUBLIC_`. |
| `RESEND_API_KEY` | Resend dashboard | Week 3 email — not yet |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Cloud Console | Map on gig pages — not yet |

## Database changes

Schema lives in `supabase/migrations/`, applied in filename order. Never edit a
migration that has already been pushed — write a new one.

```bash
npx supabase db push                      # apply anything not yet applied
npx supabase gen types typescript --project-id loklokibqsazuswrcffw > src/lib/types/database.ts
```

After regenerating types, re-append the alias block at the bottom of
`src/lib/types/database.ts` (it is marked with a comment). Anything hand-written
above that line is lost on the next regeneration.

Any new table needs `enable row level security` and its policies **in the same
migration**. A table without RLS is world-readable through the REST API.

Any new **view with `security_invoker = off`** needs an explicit
`revoke insert, update, delete on <view> from anon, authenticated` in the same
migration, and a PATCH assertion added to `scripts/rls-check.sh`. Supabase
grants write privileges on every new relation by default, and a definer view
runs writes with the owner's rights — which bypass RLS. This was found live on
`public_profiles` during the Week 9 audit and closed in migration
`20260905160100`.

### Checking RLS

```bash
./scripts/rls-check.sh
```

Hits the live API anonymously and asserts every private surface is closed. Run
it after any migration touching a policy. It exits non-zero on failure.

## Making someone an admin

Admin accounts are dedicated accounts, not promoted customers. Create one in
Supabase → Authentication → Users → **Add user → Create new user** (tick Auto
Confirm), then promote it in the SQL editor. Admins sign in at `/admin-login`
and land on `/admin`; the normal login also works and routes them there.

There is no self-service route to admin. In the Supabase SQL editor:

```sql
update public.profile_private set role = 'admin' where email = 'you@example.com';
```

(`role` and `email` live in `profile_private`, not `profiles` — see migration
`20260905170000`. The comment at the bottom of `20260905160000_admin.sql` still
names `profiles`; it was correct when written and is left as-is because pushed
migrations are never edited.)

Admins reach `/admin`. The proxy redirects non-admins, and every admin RPC
re-checks `is_admin()` internally, so the route guard is not the security
boundary — the database function is.

## Supabase settings that matter

| Setting | Current | Change when |
|---|---|---|
| Authentication → Sign In → Email → **Confirm email** | Off | Turn **on** once Resend is wired up (Week 3 scope, not yet done). Until then anyone can register with an address they don't own. The built-in mailer allows ~2 emails/hour, which is why it's off for testing. |
| Authentication → URL Configuration → Site URL | Should be `https://gigly-gilt.vercel.app` | If the production domain changes |
| Authentication → URL Configuration → Redirect URLs | localhost, production, and the `*-sowebdesignsuk-spec.vercel.app` wildcard | If the Vercel team slug changes |

## Cost tiers and when they bite

| Service | Now | Paid trigger |
|---|---|---|
| Vercel | Hobby (free) | **Commercial use is not permitted on Hobby.** Pro ($20/mo) the day GIGLY takes real bookings. |
| Supabase | Free | 500MB DB, 1GB storage, 50k MAU. Free projects **pause after 7 days of inactivity**. |
| postcodes.io | Free | Never |

## Error monitoring

Not yet set up. `src/app/error.tsx` is the boundary where a monitor plugs in;
until then, errors land in the Vercel function logs (Vercel → project →
Logs). The plan names Sentry; `npx @sentry/wizard@latest -i nextjs` is the
one-command setup once there's a DSN.

## GDPR

Admin → Users → **Erase**. Two outcomes, decided by the database:

- **No bookings:** the auth user is hard-deleted. Cascade removes everything.
- **Has bookings:** every personal field is scrubbed, uploaded images are
  removed, the account is banned, and the booking rows survive with an
  anonymised party. This is legitimate-interest retention of transactional
  records.

Either way, uploaded images become unreachable immediately.

## What is not built yet

Everything in the ten-week plan that can run without an external key is
built. Waiting on keys: email via Resend (`RESEND_API_KEY`), Sentry (DSN),
the map on gig pages (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`). Notification
preferences follow email. Phase 2 (payments, invoicing, contracts,
subscriptions) has not been started.
