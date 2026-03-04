
ALTER TABLE public.social_leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS product_interest text;
