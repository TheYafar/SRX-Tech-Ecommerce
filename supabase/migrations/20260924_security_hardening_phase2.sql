-- ============================================================================
-- Seguridad fase 2: se aplica DESPUES de publicar el frontend que:
--   * genera el id del pedido en el navegador (sin insert().select())
--   * ya no descuenta stock desde el navegador
--   * valida/canjea cupones con get_coupon_by_code / redeem_coupon
-- Cierra las puertas temporales de la fase 1.
-- ============================================================================

-- 1. El stock de pedidos "contado" lo descuenta la base de datos al guardar cada item.
create or replace function private.decrement_stock_on_order_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.orders o where o.id = new.order_id and o.order_type = 'contado') then
    update public.products
      set stock = greatest(0, coalesce(stock, 0) - coalesce(new.quantity, 1))
      where id = new.product_id;
  end if;
  return new;
end $$;
revoke all on function private.decrement_stock_on_order_item() from public;
drop trigger if exists decrement_stock_on_order_item on public.order_items;
create trigger decrement_stock_on_order_item after insert on public.order_items
  for each row execute function private.decrement_stock_on_order_item();

-- 2. Productos: solo admin puede editarlos.
drop policy if exists products_update_guarded on public.products;
create policy products_update_admin on public.products
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop trigger if exists guard_products_update on public.products;
drop function if exists private.guard_products_update();

-- 3. Cupones: solo admin los ve y edita (el checkout usa las funciones).
drop policy if exists coupons_update_guarded on public.coupons;
create policy coupons_update_admin on public.coupons
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop trigger if exists guard_coupons_update on public.coupons;
drop function if exists private.guard_coupons_update();
drop policy if exists "Permitir lectura de cupones a usuarios autenticados e invitados" on public.coupons;
create policy coupons_select_admin on public.coupons
  for select to authenticated using ((select private.is_admin()));

-- 4. Pedidos: se elimina la lectura temporal de pedidos de invitados.
drop policy if exists orders_select_guest_just_created_tmp on public.orders;
