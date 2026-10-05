-- Existing clinical photos can only be removed by an administrator. A professional
-- may clean up their failed upload before its metadata record is saved.
drop policy private_photo_delete on storage.objects;
create policy private_photo_delete on storage.objects for delete to authenticated using(bucket_id='evolution' and exists(select 1 from public.clients c where c.id::text=(storage.foldername(name))[1] and public.can_client(c.id)) and (public.is_admin() or not exists(select 1 from public.evolution_photos p where p.object_path=name)));
-- Team membership changes go through the constrained admin RPC.
drop policy professionals_write on public.professionals;
-- Harden defaults for future migrations; policies still control authenticated access.
alter default privileges in schema public revoke all on tables from anon;
