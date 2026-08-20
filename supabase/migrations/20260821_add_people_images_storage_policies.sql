-- Storage policies for the private people-images bucket.
-- Expected object path: {tree_id}/{person_id}/{uuid}.webp

drop policy if exists "People images members can read" on storage.objects;
create policy "People images members can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'people-images'
  and public.is_tree_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "People images editors can upload" on storage.objects;
create policy "People images editors can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'people-images'
  and lower(storage.extension(name)) = 'webp'
  and public.can_edit_tree((storage.foldername(name))[1]::uuid)
);

drop policy if exists "People images editors can update" on storage.objects;
create policy "People images editors can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'people-images'
  and public.can_edit_tree((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'people-images'
  and lower(storage.extension(name)) = 'webp'
  and public.can_edit_tree((storage.foldername(name))[1]::uuid)
);

drop policy if exists "People images editors can delete" on storage.objects;
create policy "People images editors can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'people-images'
  and public.can_edit_tree((storage.foldername(name))[1]::uuid)
);
