-- Tipos de mensagem para conversas WhatsApp (entrada = cliente escreveu; saída = resposta do atendente)
ALTER TYPE public.crm_message_type ADD VALUE IF NOT EXISTS 'whatsapp_entrada';
ALTER TYPE public.crm_message_type ADD VALUE IF NOT EXISTS 'whatsapp_saida';
