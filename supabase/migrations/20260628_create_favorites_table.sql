-- ============================================================
-- Migración: Tabla de Favoritos por Usuario
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Tabla para almacenar favoritos de usuarios registrados
CREATE TABLE IF NOT EXISTS public.favorites (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  text NOT NULL,
  product_data jsonb,          -- snapshot del producto para recuperarlo sin JOIN
  created_at  timestamptz DEFAULT now() NOT NULL,

  -- Un usuario no puede tener el mismo producto dos veces
  CONSTRAINT favorites_user_product_unique UNIQUE (user_id, product_id)
);

-- Índice para acelerar la consulta "dame los favoritos del usuario X"
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites (user_id);

-- ─── Row Level Security (RLS) ─────────────────────────────────────
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario solo ve SUS propios favoritos
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Política: solo el propio usuario puede insertar sus favoritos
CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: solo el propio usuario puede eliminar sus favoritos
CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Política: solo el propio usuario puede actualizar sus favoritos
CREATE POLICY "favorites_update_own"
  ON public.favorites FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
