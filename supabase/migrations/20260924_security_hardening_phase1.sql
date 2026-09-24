-- ============================================================================
-- Seguridad fase 1 (compatible con el frontend publicado hoy)
-- Proyecto: SRX-Tech-Ecommerce (wcnobggfbmpisahxihfu)
--
-- Cierra: pedidos/pagos abiertos, robo de cuentas via password_resets,
-- auto-ascenso a admin, precios/cupones/categorias editables por cualquiera,
-- lectura publica de datos de clientes.
--
-- Deja dos puertas TEMPORALES para no romper el checkout actual (se cierran
-- en la fase 2, despues de publicar el frontend nuevo):
--   * orders_select_guest_just_created_tmp  (el checkout de invitados hace insert().select())
--   * products/coupons: un no-admin solo puede BAJAR stock / sumar +1 a used_count
-- ============================================================================

-- 0. Helpers en un esquema privado (no expuesto por la API REST) -------------
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Un pedido recien creado (30 min) acepta items y pago solo de su dueno
-- (o de un invitado si el pedido es de invitado; el id es un UUID imposible de adivinar).
create or replace function private.order_is_attachable(p_order_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.created_at > now() - interval '30 minutes'
      and (o.user_id is null or o.user_id = (select auth.uid()))
  );
$$;
revoke all on function private.order_is_attachable(uuid) from public;
grant execute on function private.order_is_attachable(uuid) to anon, authenticated;

-- 1. Guardas de columnas sensibles (triggers) ---------------------------------
create or replace function private.guard_profiles_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not private.is_admin() then
    if new.role is distinct from old.role or new.id is distinct from old.id then
      raise exception 'No autorizado a modificar el rol del perfil' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_profiles_update on public.profiles;
create trigger guard_profiles_update before update on public.profiles
  for each row execute function private.guard_profiles_update();

create or replace function private.guard_products_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not private.is_admin() then
    -- Temporal: el checkout publicado descuenta stock desde el navegador.
    if (to_jsonb(new) - 'stock') is distinct from (to_jsonb(old) - 'stock')
       or coalesce(new.stock, 0) > coalesce(old.stock, 0) then
      raise exception 'No autorizado a modificar productos' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_products_update on public.products;
create trigger guard_products_update before update on public.products
  for each row execute function private.guard_products_update();

create or replace function private.guard_coupons_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not private.is_admin() then
    -- Temporal: el checkout publicado suma +1 a used_count desde el navegador.
    if (to_jsonb(new) - 'used_count') is distinct from (to_jsonb(old) - 'used_count')
       or coalesce(new.used_count, 0) <> coalesce(old.used_count, 0) + 1
       or (old.max_uses is not null and coalesce(old.used_count, 0) >= old.max_uses) then
      raise exception 'No autorizado a modificar cupones' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_coupons_update on public.coupons;
create trigger guard_coupons_update before update on public.coupons
  for each row execute function private.guard_coupons_update();

-- 2. orders ---------------------------------------------------------------------
alter table public.orders enable row level security;
drop policy if exists "Permitir a clientes crear ordenes" on public.orders;
drop policy if exists "Permitir creación de órdenes a todo el mundo" on public.orders;
drop policy if exists "Permitir_crear_ordenes" on public.orders;
drop policy if exists "Permitir_leer_ordenes" on public.orders;
drop policy if exists "Usuarios registrados ven sus propias órdenes" on public.orders;

create policy orders_insert_checkout on public.orders
  for insert to anon, authenticated
  with check (
    (select private.is_admin())
    or (
      (user_id is null or user_id = (select auth.uid()))
      and status = 'pending_payment'
      and meta_context is null
      and meta_purchase_sent_at is null
    )
  );
create policy orders_select_own_or_admin on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
-- TEMPORAL (fase 2 la elimina): permite al checkout de invitados leer el pedido que acaba de crear.
create policy orders_select_guest_just_created_tmp on public.orders
  for select to anon
  using (user_id is null and created_at > now() - interval '2 minutes');
create policy orders_update_admin on public.orders
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy orders_delete_admin on public.orders
  for delete to authenticated
  using ((select private.is_admin()));

-- 3. order_items -----------------------------------------------------------------
drop policy if exists "Permitir_insertar_items" on public.order_items;
drop policy if exists "Permitir_leer_items" on public.order_items;
create policy order_items_insert_checkout on public.order_items
  for insert to anon, authenticated
  with check (private.order_is_attachable(order_id));
create policy order_items_select_own_or_admin on public.order_items
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );
create policy order_items_update_admin on public.order_items
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy order_items_delete_admin on public.order_items
  for delete to authenticated
  using ((select private.is_admin()));

-- 4. payments ----------------------------------------------------------------------
alter table public.payments enable row level security;
drop policy if exists "Permitir_insertar_pagos" on public.payments;
drop policy if exists "Permitir_leer_pagos" on public.payments;
create policy payments_insert_checkout on public.payments
  for insert to anon, authenticated
  with check (
    (select private.is_admin())
    or (private.order_is_attachable(order_id) and status = 'pending_verification')
  );
create policy payments_select_admin on public.payments
  for select to authenticated
  using ((select private.is_admin()));
create policy payments_update_admin on public.payments
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy payments_delete_admin on public.payments
  for delete to authenticated
  using ((select private.is_admin()));

-- 5. profiles ------------------------------------------------------------------------
drop policy if exists "Permitir lectura de perfiles autenticados" on public.profiles;
drop policy if exists "Permitir lectura publica de perfiles" on public.profiles;
drop policy if exists "Permitir lectura publica perfiles" on public.profiles;
drop policy if exists "Permitir_lectura_publica_perfiles" on public.profiles;
drop policy if exists "Usuarios leen su propio perfil" on public.profiles;
drop policy if exists "Usuarios pueden actualizar su propio perfil" on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- 6. products ---------------------------------------------------------------------------
drop policy if exists "Permitir insertar productos" on public.products;
drop policy if exists "Permitir_insertar_productos" on public.products;
drop policy if exists "Permitir actualizaciones productos" on public.products;
drop policy if exists "Permitir_leer_productos" on public.products;
-- (se mantiene "Lectura publica productos")
create policy products_insert_admin on public.products
  for insert to authenticated
  with check ((select private.is_admin()));
-- UPDATE: admin libre; no-admin solo puede bajar stock (lo impone guard_products_update).
create policy products_update_guarded on public.products
  for update to anon, authenticated
  using (true) with check (true);
create policy products_delete_admin on public.products
  for delete to authenticated
  using ((select private.is_admin()));

-- 7. categories ---------------------------------------------------------------------------
drop policy if exists "auth_delete_categories" on public.categories;
drop policy if exists "auth_insert_categories" on public.categories;
drop policy if exists "auth_update_categories" on public.categories;
drop policy if exists "Admin can delete categories" on public.categories;
drop policy if exists "Permitir inserción solo a administradores" on public.categories;
drop policy if exists "Lectura publica categorias" on public.categories;
drop policy if exists "Permitir lectura pública de categorías" on public.categories;
drop policy if exists "Permitir_leer_categorias" on public.categories;
-- (se mantiene "public_read_categories")
create policy categories_insert_admin on public.categories
  for insert to authenticated with check ((select private.is_admin()));
create policy categories_update_admin on public.categories
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy categories_delete_admin on public.categories
  for delete to authenticated using ((select private.is_admin()));

-- 8. coupons / coupon_usages ---------------------------------------------------------------
drop policy if exists "Permitir inserción de cupones solo a administradores autentica" on public.coupons;
drop policy if exists "Permitir actualización de cupones solo a administradores" on public.coupons;
-- (se mantiene temporalmente la lectura por codigo; fase 2 la cambia por una funcion)
create policy coupons_insert_admin on public.coupons
  for insert to authenticated with check ((select private.is_admin()));
-- UPDATE: admin libre; no-admin solo +1 a used_count (lo impone guard_coupons_update).
create policy coupons_update_guarded on public.coupons
  for update to authenticated using (true) with check (true);
create policy coupons_delete_admin on public.coupons
  for delete to authenticated using ((select private.is_admin()));

create policy coupon_usages_select_own_or_admin on public.coupon_usages
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy coupon_usages_insert_own on public.coupon_usages
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 9. inventory_transactions --------------------------------------------------------------------
drop policy if exists "Permitir_insertar_inventario" on public.inventory_transactions;
create policy inventory_insert_admin on public.inventory_transactions
  for insert to authenticated with check ((select private.is_admin()));
create policy inventory_select_admin on public.inventory_transactions
  for select to authenticated using ((select private.is_admin()));

-- 10. product_recommendations ---------------------------------------------------------------------
alter table public.product_recommendations enable row level security;
create policy product_recommendations_public_read on public.product_recommendations
  for select to anon, authenticated using (true);
create policy product_recommendations_insert_admin on public.product_recommendations
  for insert to authenticated with check ((select private.is_admin()));
create policy product_recommendations_update_admin on public.product_recommendations
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy product_recommendations_delete_admin on public.product_recommendations
  for delete to authenticated using ((select private.is_admin()));

-- 11. payment_methods (solo nombres; el checkout los busca) ------------------------------------------
create policy payment_methods_public_read on public.payment_methods
  for select to anon, authenticated using (true);

-- 12. password_resets: solo el backend (service role, que ignora RLS) -----------------------------------
drop policy if exists "Permitir control total al Service Role" on public.password_resets;

-- 13. Vista y funciones marcadas por el asesor ----------------------------------------------------------
alter view public.view_products_with_parent_categories set (security_invoker = true);
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 14. Funciones para la fase 2 del frontend (aditivas, no cambian nada hoy) ----------------------------
create or replace function public.get_coupon_by_code(p_code text)
returns setof public.coupons
language sql stable security definer
set search_path = ''
as $$
  select * from public.coupons
  where code = upper(trim(p_code)) and is_active = true
  limit 1;
$$;
revoke all on function public.get_coupon_by_code(text) from public;
grant execute on function public.get_coupon_by_code(text) to anon, authenticated;

create or replace function public.redeem_coupon(p_coupon_id bigint)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_uid uuid := (select auth.uid());
  v_max int;
begin
  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found or not coalesce(v_coupon.is_active, false) then
    raise exception 'Cupón inválido o inactivo';
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    raise exception 'El cupón ha expirado';
  end if;
  v_max := coalesce(v_coupon.max_uses, case when upper(v_coupon.code) = 'SRXTECH10' then 10 end);
  if v_max is not null and coalesce(v_coupon.used_count, 0) >= v_max then
    raise exception 'Este cupón ya alcanzó su límite máximo de canjes.';
  end if;
  if (coalesce(v_coupon.is_single_use, false) or upper(v_coupon.code) = 'SRXTECH10') and v_uid is null then
    raise exception 'Debes iniciar sesión para usar este cupón.';
  end if;
  if v_uid is not null then
    begin
      insert into public.coupon_usages (user_id, coupon_id) values (v_uid, p_coupon_id);
    exception when unique_violation then
      raise exception 'Ya has utilizado este cupón anteriormente.';
    end;
  end if;
  update public.coupons set used_count = coalesce(used_count, 0) + 1 where id = p_coupon_id;
end $$;
revoke all on function public.redeem_coupon(bigint) from public;
grant execute on function public.redeem_coupon(bigint) to anon, authenticated;

-- 15. Indices que faltaban (rendimiento con mas trafico) ---------------------------------------------
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_coupon_usages_coupon_id on public.coupon_usages (coupon_id);
create index if not exists idx_categories_parent_id on public.categories (parent_id);
