-- ============================================================
-- Tabela knowledge_base: espelho do vault Obsidian
-- Cada nota .md do vault vira uma linha aqui
-- A automação busca APENAS as notas relevantes por intent
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id            SERIAL PRIMARY KEY,
  caminho       TEXT NOT NULL UNIQUE,    -- ex: 'cardapio/bolos', 'operacao/taxas'
  titulo        TEXT NOT NULL,           -- nome legível
  conteudo      TEXT NOT NULL,           -- conteúdo markdown da nota
  tags          TEXT[] DEFAULT '{}',     -- tags para busca: 'bolo', 'preco', 'delivery', etc.
  ativa         BOOLEAN DEFAULT TRUE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_caminho ON public.knowledge_base(caminho);
CREATE INDEX IF NOT EXISTS idx_kb_tags ON public.knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_ativa ON public.knowledge_base(ativa);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kb_updated_at ON public.knowledge_base;
CREATE TRIGGER trigger_kb_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at();

-- RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read kb" ON public.knowledge_base
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages kb" ON public.knowledge_base
  FOR ALL TO service_role USING (true) WITH CHECK (true);
