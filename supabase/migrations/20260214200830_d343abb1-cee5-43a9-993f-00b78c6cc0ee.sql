
-- Add new status values to social_lead_status enum
ALTER TYPE social_lead_status ADD VALUE IF NOT EXISTS 'novo_lead';
ALTER TYPE social_lead_status ADD VALUE IF NOT EXISTS 'em_negociacao';
ALTER TYPE social_lead_status ADD VALUE IF NOT EXISTS 'proposta_aceita';

-- Add new columns to social_leads
ALTER TABLE social_leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE social_leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE social_leads ADD COLUMN IF NOT EXISTS potential_value numeric DEFAULT 0;
ALTER TABLE social_leads ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE social_leads ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();
