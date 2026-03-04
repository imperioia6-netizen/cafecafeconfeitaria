ALTER TABLE public.sales
  ADD COLUMN order_number text DEFAULT NULL,
  ADD COLUMN table_number text DEFAULT NULL,
  ADD COLUMN customer_name text DEFAULT NULL;