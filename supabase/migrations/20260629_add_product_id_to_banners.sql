-- ============================================================
-- Migración: Agregar columna product_id a la tabla banners
-- Ejecutar en: Supabase > SQL Editor o CLI
-- ============================================================

-- 1. Agregar la columna product_id a la tabla banners si no existe
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS product_id UUID;

-- 2. Asegurar que existe la clave foránea referenciando a public.products(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'banners' 
          AND kcu.column_name = 'product_id'
    ) THEN
        ALTER TABLE public.banners
        ADD CONSTRAINT fk_banners_product
        FOREIGN KEY (product_id) 
        REFERENCES public.products(id)
        ON DELETE SET NULL;
    END IF;
END $$;
