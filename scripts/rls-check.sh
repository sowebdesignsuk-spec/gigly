#!/usr/bin/env bash
# ============================================================================
# RLS smoke test — Section 5, Week 9.6 "Security audit: check RLS policies".
#
# Hits the live REST API as an ANONYMOUS caller (publishable key only) and
# asserts that everything private stays private. Run it after any migration
# that touches a policy:
#
#   ./scripts/rls-check.sh
#
# Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
# .env.local. Exits non-zero on the first failure, so it can gate a deploy.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
set -a; source .env.local; set +a

URL="${NEXT_PUBLIC_SUPABASE_URL:?}/rest/v1"
KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?}"

pass=0; fail=0

expect() { # expect <description> <expected> <actual>
  if [[ "$2" == "$3" ]]; then
    printf '  ok    %s\n' "$1"; pass=$((pass+1))
  else
    printf '  FAIL  %s (expected %s, got %s)\n' "$1" "$2" "$3"; fail=$((fail+1))
  fi
}

get()  { curl -s -H "apikey: $KEY" "$URL/$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' -H "apikey: $KEY" -H 'Content-Type: application/json' "$@"; }

echo "Anonymous reads that must return nothing:"
expect "profile_private (email, phone, role)" "[]" "$(get 'profile_private?select=user_id')"
# profiles no longer has these columns at all. Asking for one must be a hard
# error, not an empty result — proves the split actually happened.
expect "profiles has no email column"      "400" "$(code "$URL/profiles?select=email&limit=1")"
expect "profiles has no role column"       "400" "$(code "$URL/profiles?select=role&limit=1")"
expect "applications (rival fees)"         "[]" "$(get 'applications?select=id')"
expect "bookings (financial records)"      "[]" "$(get 'bookings?select=id')"
expect "conversations"                     "[]" "$(get 'conversations?select=id')"
expect "messages"                          "[]" "$(get 'messages?select=id')"
expect "notifications"                     "[]" "$(get 'notifications?select=id')"
expect "availability (needs sign-in)"      "[]" "$(get 'availability?select=id')"
expect "draft gigs"                        "[]" "$(get 'gigs?select=id&visibility=eq.draft')"

echo "Anonymous writes that must be rejected (401):"
expect "insert notification"  "401" "$(code -X POST "$URL/notifications" -d '{"user_id":"00000000-0000-0000-0000-000000000000","type":"system","title":"x","body":"y"}')"
expect "insert gig"           "401" "$(code -X POST "$URL/gigs" -d '{"venue_id":"00000000-0000-0000-0000-000000000000","title":"x","category":"dj","description":"x","date":"2030-01-01","start_time":"20:00","location_text":"x","budget_min":1}')"
expect "insert application"   "401" "$(code -X POST "$URL/applications" -d '{"gig_id":"00000000-0000-0000-0000-000000000000","entertainer_id":"00000000-0000-0000-0000-000000000000"}')"
# A PATCH that RLS filters to zero rows returns 204, which looks like success.
# So: target a REAL profile, ask for the updated rows back, and require none.
real_id="$(get 'public_profiles?select=id&limit=1' | grep -oE '[0-9a-f-]{36}' | head -1)"
before="$(get "public_profiles?select=full_name&id=eq.$real_id")"
patched="$(curl -s -X PATCH -H "apikey: $KEY" -H 'Content-Type: application/json' -H 'Prefer: return=representation' "$URL/profiles?id=eq.$real_id" -d '{"full_name":"pwned"}')"
after="$(get "public_profiles?select=full_name&id=eq.$real_id")"
expect "update a real profile touches 0 rows" "[]" "$patched"
expect "…and the name is unchanged"           "$before" "$after"
# The view is a definer view, so a write through it would bypass RLS entirely.
# Migration 20260905160100 made it non-updatable; Postgres refuses that in the
# rewriter (500) before it even reaches the privilege check (401/403). Any of
# those is a refusal — what matters is that the row is untouched afterwards.
view_code="$(code -X PATCH "$URL/public_profiles?id=eq.$real_id" -d '{"full_name":"pwned"}')"
[[ "$view_code" == "204" || "$view_code" == "401" || "$view_code" == "403" || "$view_code" == "500" ]] && view_code="refused"
expect "update via public_profiles view refused" "refused" "$view_code"
expect "…and the name is still unchanged"        "$before" "$(get "public_profiles?select=full_name&id=eq.$real_id")"

echo "Admin functions must refuse anonymous callers:"
expect "admin_stats returns nothing" "[]" "$(curl -s -X POST -H "apikey: $KEY" -H 'Content-Type: application/json' "$URL/rpc/admin_stats" -d '{}')"
admin_code="$(code -X POST "$URL/rpc/admin_erase_user" -d '{"p_user_id":"00000000-0000-0000-0000-000000000000"}')"
# is_admin() raises 42501; PostgREST reports that as 401 to an anonymous
# caller (403 to a signed-in one). Either means the function refused.
[[ "$admin_code" == "401" || "$admin_code" == "403" ]] && admin_code="refused"
expect "admin_erase_user refused" "refused" "$admin_code"

echo "Public surfaces that must stay public:"
expect "public_profiles readable"  "200" "$(code "$URL/public_profiles?select=id&limit=1")"
expect "profiles (public columns) readable" "200" "$(code "$URL/profiles?select=id,full_name&limit=1")"
expect "published gigs readable"   "200" "$(code "$URL/gigs?select=id&visibility=eq.published&limit=1")"
expect "search_gigs callable"      "200" "$(code -X POST "$URL/rpc/search_gigs" -d '{}')"

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
