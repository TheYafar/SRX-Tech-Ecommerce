-- ============================================================
-- Migración: Agregar columna "order" a la tabla categories
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Agregar la columna "order" (INTEGER) si no existe.
--    DEFAULT 0 para que los registros existentes queden sin romper.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- 2. Asegurarse de que la RLS no bloquee la escritura por usuarios autenticados (admin).
--    Si ya tienes una política UPDATE para la tabla categories, omite este bloque.
--    De lo contrario, habilita la actualización para el rol autenticado:
--
--  CREATE POLICY "Admins can update category order"
--    ON public.categories
--    FOR UPDATE
--    USING (auth.role() = 'authenticated')
--    WITH CHECK (auth.role() = 'authenticated');

-- 3. (Opcional) Índice para acelerar las consultas ordenadas por este campo.
CREATE INDEX IF NOT EXISTS idx_categories_order
  ON public.categories ("order" ASC);
