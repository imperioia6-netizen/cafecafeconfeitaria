-- Adicionar campos de debounce na tabela sessions
-- para agrupar mensagens rápidas do WhatsApp antes de responder

-- Criar tabela sessions se não existir
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remote_jid TEXT NOT NULL,
  customer_name TEXT,
  memory JSONB DEFAULT '{}',
  pending_messages JSONB DEFAULT '[]',
  debounce_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sessions_remote_jid_unique UNIQUE (remote_jid)
);

-- Se a tabela já existe, adicionar os campos novos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'pending_messages'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN pending_messages JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'debounce_until'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN debounce_until TIMESTAMPTZ;
  END IF;
END $$;

-- Índice para busca rápida por remote_jid (se não existir)
CREATE INDEX IF NOT EXISTS idx_sessions_remote_jid ON public.sessions (remote_jid);

-- RLS: permitir acesso via service role (edge functions)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policy para service role (se não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'sessions_service_role_all'
  ) THEN
    CREATE POLICY sessions_service_role_all ON public.sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
