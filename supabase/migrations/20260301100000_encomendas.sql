-- Encomendas: pedidos feitos por encomenda (ex.: WhatsApp), com 50% adiantado e restante na entrega.
CREATE TABLE IF NOT EXISTS public.encomendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  product_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  total_value NUMERIC NOT NULL DEFAULT 0,
  address TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credito', 'debito', 'dinheiro')),
  paid_50_percent BOOLEAN NOT NULL DEFAULT false,
  observations TEXT,
  delivery_date DATE,
  delivery_time_slot TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', '50_pago', 'em_preparo', 'entregue', 'cancelado')),
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read encomendas" ON public.encomendas;
DROP POLICY IF EXISTS "Authenticated insert encomendas" ON public.encomendas;
DROP POLICY IF EXISTS "Authenticated update encomendas" ON public.encomendas;
CREATE POLICY "Authenticated read encomendas" ON public.encomendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert encomendas" ON public.encomendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update encomendas" ON public.encomendas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_encomendas_updated_at ON public.encomendas;
CREATE TRIGGER update_encomendas_updated_at
  BEFORE UPDATE ON public.encomendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.encomendas IS 'Pedidos de encomenda (ex. WhatsApp): 50% adiantado (PIX/cartão), restante na entrega.';
