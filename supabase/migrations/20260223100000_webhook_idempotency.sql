-- Evita processar a mesma mensagem da Evolution duas vezes (retries)
CREATE TABLE IF NOT EXISTS public.webhook_processed_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_processed_events ENABLE ROW LEVEL SECURITY;

-- Sem políticas: apenas service role (Edge Functions) acessa; anon/authenticated não têm acesso.
COMMENT ON TABLE public.webhook_processed_events IS 'Ids de eventos já processados pelo evolution-webhook (idempotência).';
