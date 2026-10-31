-- JACOB'S — media storage (Supabase Storage).
-- Public bucket for the logo, barber photos and gallery images: anyone can view,
-- only the owner can upload, replace or delete.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media is publicly readable" on storage.objects
  for select using (bucket_id = 'media');
create policy "owner uploads media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and app.is_owner());
create policy "owner updates media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and app.is_owner());
create policy "owner deletes media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and app.is_owner());
