
-- Add 'cardapio_digital' to sales_channel enum
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'cardapio_digital';

-- Add customer_phone column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
