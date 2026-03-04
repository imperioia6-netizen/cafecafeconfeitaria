ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_delivery_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz DEFAULT NULL;