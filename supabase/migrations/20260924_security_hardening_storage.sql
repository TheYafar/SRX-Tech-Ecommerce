-- ============================================================================
-- Seguridad: Storage. Solo el admin sube/edita/borra imagenes del catalogo;
-- el checkout (invitado o cliente) solo puede subir comprobantes en receipts/.
-- ============================================================================
drop policy if exists "Permitir subir comprobantes 1852nix_0" on storage.objects;
drop policy if exists "Permitir subir imagenes de productos jegzm5_0" on storage.objects;
drop policy if exists "Permitir crear productos anon y auth 1ifhysk_0" on storage.objects;
drop policy if exists "Permitir subida de banners a admins" on storage.objects;

create policy storage_receipts_upload_checkout on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'comprobantes_pago' and (storage.foldername(name))[1] = 'receipts');

create policy storage_admin_select on storage.objects
  for select to authenticated
  using (bucket_id in ('products', 'hero-banners', 'banners_cupones', 'uploadProductImage', 'payments', 'comprobantes_pago')
         and (select private.is_admin()));
create policy storage_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('products', 'hero-banners', 'banners_cupones', 'uploadProductImage', 'payments')
              and (select private.is_admin()));
create policy storage_admin_update on storage.objects
  for update to authenticated
  using (bucket_id in ('products', 'hero-banners', 'banners_cupones', 'uploadProductImage', 'payments')
         and (select private.is_admin()))
  with check (bucket_id in ('products', 'hero-banners', 'banners_cupones', 'uploadProductImage', 'payments')
              and (select private.is_admin()));
create policy storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('products', 'hero-banners', 'banners_cupones', 'uploadProductImage', 'payments', 'comprobantes_pago')
         and (select private.is_admin()));
