-- ============================================================
-- Migración: Tabla de Recomendaciones / Complementos de Productos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  recommended_product_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT fk_product_recommendations_product
    FOREIGN KEY (product_id) 
    REFERENCES public.products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_product_recommendations_recommended
    FOREIGN KEY (recommended_product_id) 
    REFERENCES public.products(id)
    ON DELETE CASCADE,

  -- Un producto no puede recomendar el mismo accesorio más de una vez
  CONSTRAINT product_recommendations_unique UNIQUE (product_id, recommended_product_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todo el público
CREATE POLICY "product_recommendations_select_public"
  ON public.product_recommendations FOR SELECT
  USING (true);

-- Política de escritura/modificación/eliminación para usuarios autenticados
CREATE POLICY "product_recommendations_admin_all"
  ON public.product_recommendations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
