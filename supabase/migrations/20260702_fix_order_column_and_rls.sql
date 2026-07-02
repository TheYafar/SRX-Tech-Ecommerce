-- ============================================================
-- FIX: Columna "order" y politicas RLS en categories
-- Ejecutar en: Supabase > SQL Editor
-- Fecha: 2026-07-02
-- ============================================================

-- PASO 1: Crear columna "order" si no existe
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- PASO 2: Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- PASO 3: Politica SELECT (lectura publica)
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories"
  ON public.categories
  FOR SELECT
  USING (true);

-- PASO 4: Politica UPDATE para autenticados (FIX PRINCIPAL)
DROP POLICY IF EXISTS "auth_update_categories" ON public.categories;
CREATE POLICY "auth_update_categories"
  ON public.categories
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- PASO 5: Politica INSERT para autenticados
DROP POLICY IF EXISTS "auth_insert_categories" ON public.categories;
CREATE POLICY "auth_insert_categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- PASO 6: Politica DELETE para autenticados
DROP POLICY IF EXISTS "auth_delete_categories" ON public.categories;
CREATE POLICY "auth_delete_categories"
  ON public.categories
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- PASO 7: Indice de rendimiento
CREATE INDEX IF NOT EXISTS idx_categories_order
  ON public.categories ("order" ASC);
