
-- 1. Novas colunas em recipes
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS sells_whole boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sells_slice boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whole_weight_grams numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slice_weight_grams numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whole_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slice_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_per_gram numeric DEFAULT NULL;

-- 2. Nova coluna em inventory
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS stock_grams numeric NOT NULL DEFAULT 0;

-- 3. unit_type em sale_items e order_items
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'slice';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'slice';

-- 4. Migrar dados existentes de recipes
UPDATE public.recipes SET
  sells_slice = (sell_mode = 'fatia' OR sell_mode IS NULL),
  sells_whole = (sell_mode = 'inteiro'),
  slice_weight_grams = slice_weight_g,
  whole_weight_grams = CASE WHEN sell_mode = 'inteiro' THEN weight_kg * 1000 ELSE NULL END,
  slice_price = CASE WHEN sell_mode = 'fatia' OR sell_mode IS NULL THEN sale_price ELSE NULL END,
  whole_price = CASE WHEN sell_mode = 'inteiro' THEN sale_price ELSE NULL END,
  cost_per_gram = CASE
    WHEN direct_cost IS NOT NULL AND slice_weight_g > 0 THEN direct_cost / slice_weight_g
    ELSE NULL
  END;

-- 5. Converter inventory de slices para gramas
UPDATE public.inventory SET
  stock_grams = slices_available * COALESCE(
    (SELECT r.slice_weight_g FROM public.recipes r WHERE r.id = inventory.recipe_id), 250
  );
