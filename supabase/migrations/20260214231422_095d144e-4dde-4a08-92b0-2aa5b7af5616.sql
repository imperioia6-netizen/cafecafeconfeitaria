
ALTER TABLE public.ingredients
  ADD COLUMN stock_quantity numeric DEFAULT 0,
  ADD COLUMN min_stock numeric DEFAULT 0,
  ADD COLUMN expiry_date date DEFAULT NULL;
