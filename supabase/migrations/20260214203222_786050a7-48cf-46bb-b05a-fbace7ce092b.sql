
-- Tabela de promoções automáticas geradas para itens 12h+ no estoque
CREATE TABLE public.auto_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id),
  original_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 20,
  promo_price NUMERIC NOT NULL DEFAULT 0,
  hours_in_stock NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'vendida', 'expirada')),
  sent_via TEXT DEFAULT NULL,
  message_content TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  sold_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

ALTER TABLE public.auto_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage auto_promotions" ON public.auto_promotions FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read auto_promotions" ON public.auto_promotions FOR SELECT USING (is_employee());

-- Tabela de relatórios gerados por IA
CREATE TABLE public.ai_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL DEFAULT 'weekly' CHECK (report_type IN ('weekly', 'biweekly', 'monthly', 'upsell', 'economy')),
  period_days INTEGER NOT NULL DEFAULT 7,
  content TEXT NOT NULL,
  summary TEXT DEFAULT NULL,
  suggestions JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  sent_via TEXT DEFAULT NULL
);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage ai_reports" ON public.ai_reports FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read ai_reports" ON public.ai_reports FOR SELECT USING (is_employee());

-- Index para buscar promoções ativas rapidamente
CREATE INDEX idx_auto_promotions_status ON public.auto_promotions(status);
CREATE INDEX idx_auto_promotions_inventory ON public.auto_promotions(inventory_id);
CREATE INDEX idx_ai_reports_type ON public.ai_reports(report_type);
