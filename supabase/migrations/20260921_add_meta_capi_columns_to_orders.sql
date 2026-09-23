-- ============================================================
-- Migración: columnas para la API de Conversiones de Meta
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Contexto del navegador al momento de la compra (fbp, fbc, IP, user agent, URL).
-- Lo guarda la Edge Function 'meta-capi' (service role) una sola vez, justo después
-- de crear la orden, para poder enviar el Purchase cuando el pago se apruebe.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS meta_context jsonb;

-- Marca de idempotencia: fecha en que se envió el Purchase a Meta.
-- Evita enviar la misma compra dos veces aunque el estado se guarde repetidas veces.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS meta_purchase_sent_at timestamptz;

-- Las órdenes ya existentes no deben reenviarse a Meta si vuelven a actualizarse.
UPDATE public.orders
SET meta_purchase_sent_at = now()
WHERE meta_purchase_sent_at IS NULL
  AND status IN ('paid', 'processing', 'ready', 'shipped', 'delivered');

-- Seguridad: estas columnas solo deben leerse/escribirse con service role.
-- Si tus políticas RLS de 'orders' permiten a los usuarios leer/editar su propia fila,
-- comprueba que no puedan modificar estas dos columnas (por ejemplo, usando una vista
-- o limitando el UPDATE de clientes a las columnas necesarias).
COMMENT ON COLUMN public.orders.meta_context IS 'Contexto del navegador para Meta CAPI (solo service role).';
COMMENT ON COLUMN public.orders.meta_purchase_sent_at IS 'Cuándo se envió el Purchase a Meta CAPI (idempotencia).';
