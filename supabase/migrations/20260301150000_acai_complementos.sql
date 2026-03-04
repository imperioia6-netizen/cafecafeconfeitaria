-- Adicionar categoria 'acai' ao enum product_category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'product_category' AND e.enumlabel = 'acai'
  ) THEN
    ALTER TYPE public.product_category ADD VALUE 'acai';
  END IF;
END$$;

-- Coluna complementos em recipes (produtos que permitem "montar" ex: açaí)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS complementos text[] DEFAULT '{}';

COMMENT ON COLUMN public.recipes.complementos IS 'Lista de complementos para produtos montáveis (ex: açaí). Ex: Morango, Banana, Leite condensado.';
