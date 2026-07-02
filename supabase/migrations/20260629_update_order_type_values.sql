-- Cambiar el default a 'contado'
ALTER TABLE public.orders ALTER COLUMN order_type SET DEFAULT 'contado';

-- Actualizar registros existentes de 'al_contado' a 'contado' y de 'por_encargo' a 'encargo'
UPDATE public.orders SET order_type = 'contado' WHERE order_type = 'al_contado';
UPDATE public.orders SET order_type = 'encargo' WHERE order_type = 'por_encargo';
