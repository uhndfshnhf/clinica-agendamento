-- Qualify the outer object name: clients also has a name column.
drop policy private_photo_read on storage.objects;
drop policy private_photo_upload on storage.objects;
drop policy private_photo_delete on storage.objects;
create policy private_photo_read on storage.objects for select to authenticated using(bucket_id='evolution' and exists(select 1 from public.evolution_photos p where p.object_path=storage.objects.name and public.can_client(p.client_id)));
create policy private_photo_upload on storage.objects for insert to authenticated with check(bucket_id='evolution' and exists(select 1 from public.clients c where c.id::text=(storage.foldername(storage.objects.name))[1] and public.can_client(c.id)) and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy private_photo_delete on storage.objects for delete to authenticated using(bucket_id='evolution' and exists(select 1 from public.clients c where c.id::text=(storage.foldername(storage.objects.name))[1] and public.can_client(c.id)) and (public.is_admin() or not exists(select 1 from public.evolution_photos p where p.object_path=storage.objects.name)));
