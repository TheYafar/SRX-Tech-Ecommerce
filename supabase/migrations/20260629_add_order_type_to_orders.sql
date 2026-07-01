-- ============================================================
-- Migración: Agregar columna order_type a la tabla orders
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Agregar la columna order_type a la tabla orders si no existe
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'al_contado';

-- 2. Actualizar los registros históricos usando las reglas de negocio anteriores de forma retroactiva
UPDATE public.orders o
SET order_type = 'por_encargo'
WHERE o.status = 'pending'
   OR EXISTS (
      SELECT 1 
      FROM public.order_items oi
      JOIN public.products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
        AND (p.stock IS NULL OR p.stock <= 0)
   );
