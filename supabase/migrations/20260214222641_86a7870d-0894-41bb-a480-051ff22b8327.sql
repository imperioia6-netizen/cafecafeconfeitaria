ALTER TABLE public.cash_closings
  ADD COLUMN counted_cash numeric DEFAULT NULL,
  ADD COLUMN cash_difference numeric DEFAULT NULL;