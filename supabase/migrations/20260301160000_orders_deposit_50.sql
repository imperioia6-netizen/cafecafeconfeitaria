ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deposit_50_paid boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.deposit_50_paid IS 'Indica se houve pagamento antecipado de 50% deste pedido.';

