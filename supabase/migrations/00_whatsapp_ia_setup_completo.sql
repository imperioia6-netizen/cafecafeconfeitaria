-- ============================================================
-- Setup completo: WhatsApp + IA (atendente e assistente)
-- Execute UMA VEZ no Supabase: SQL Editor > New query > Cole e Run
-- ============================================================

-- 1) Tipos de mensagem WhatsApp para CRM
ALTER TYPE public.crm_message_type ADD VALUE IF NOT EXISTS 'whatsapp_entrada';
ALTER TYPE public.crm_message_type ADD VALUE IF NOT EXISTS 'whatsapp_saida';

-- 2) Tabela de idempotência do webhook (evita processar a mesma mensagem duas vezes)
CREATE TABLE IF NOT EXISTS public.webhook_processed_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_processed_events ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.webhook_processed_events IS 'Eventos já processados pelo evolution-webhook.';
