-- ============================================================================
-- Week 2 — storage buckets for profile and venue imagery
-- Section 2.3: "Storage buckets for profile photos, media uploads, and venue
-- images." Section 5, Week 2.2 and 2.6.
-- ============================================================================

-- Both buckets are public-read: these images appear on public profile pages
-- (Week 8) and in gig listings, so signed URLs would mean a round trip per
-- thumbnail. Write access is what matters, and that is locked down below.
--
-- file_size_limit is in bytes. The client resizes before upload; this is the
-- backstop for when it does not.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',      'avatars',      true, 5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('venue-photos', 'venue-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Write policies
--
-- Both buckets use the convention <user-id>/<filename>. The policies below
-- compare the first path segment to auth.uid(), so a user can only ever write
-- inside their own folder — without that check, any signed-in user could
-- overwrite anyone else's avatar.
-- ---------------------------------------------------------------------------

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Venue photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'venue-photos');

create policy "Venues upload their own photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Venues replace their own photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Venues delete their own photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
