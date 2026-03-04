
-- Enum for cash register names
CREATE TYPE public.cash_register_name AS ENUM ('caixa_1', 'caixa_2', 'delivery');

-- Cash registers (open/close sessions)
CREATE TABLE public.cash_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name cash_register_name NOT NULL,
  opened_by UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  is_open BOOLEAN NOT NULL DEFAULT true,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage cash_registers" ON public.cash_registers FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read cash_registers" ON public.cash_registers FOR SELECT USING (is_employee());
CREATE POLICY "Employee can insert cash_registers" ON public.cash_registers FOR INSERT WITH CHECK (is_employee() AND opened_by = auth.uid());
CREATE POLICY "Employee can update own cash_registers" ON public.cash_registers FOR UPDATE USING (is_employee() AND opened_by = auth.uid());

-- Cash closings (summary when a register is closed)
CREATE TABLE public.cash_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
  closed_by UUID NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage cash_closings" ON public.cash_closings FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read cash_closings" ON public.cash_closings FOR SELECT USING (is_employee());
CREATE POLICY "Employee can insert cash_closings" ON public.cash_closings FOR INSERT WITH CHECK (is_employee() AND closed_by = auth.uid());

-- Closing details (breakdown by payment method)
CREATE TABLE public.closing_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_id UUID NOT NULL REFERENCES public.cash_closings(id),
  payment_method payment_method NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.closing_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage closing_details" ON public.closing_details FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read closing_details" ON public.closing_details FOR SELECT USING (is_employee());
CREATE POLICY "Employee can insert closing_details" ON public.closing_details FOR INSERT WITH CHECK (is_employee());

-- Add cash_register_id to sales table to track which register a sale belongs to
ALTER TABLE public.sales ADD COLUMN cash_register_id UUID REFERENCES public.cash_registers(id);

-- Index for performance
CREATE INDEX idx_sales_cash_register ON public.sales(cash_register_id);
CREATE INDEX idx_sales_sold_at ON public.sales(sold_at);
CREATE INDEX idx_cash_registers_is_open ON public.cash_registers(is_open);
CREATE INDEX idx_cash_closings_closed_at ON public.cash_closings(closed_at);
