-- ============================================================
-- Tabela agent_rules: banco de regras do agente WhatsApp
-- Separa regras por categoria para busca seletiva (prompt menor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_rules (
  id            SERIAL PRIMARY KEY,
  categoria     TEXT NOT NULL,          -- ex: 'core', 'precos', 'bolos', 'salgados', 'delivery', 'pagamento', 'fluxo_pedido', 'horario', 'anti_alucinacao', 'interpretacao', 'saudacao', 'continuidade', 'recomendacao', 'cadastro', 'registro'
  titulo        TEXT NOT NULL,          -- nome curto para identificação humana
  conteudo      TEXT NOT NULL,          -- o texto da regra (markdown)
  prioridade    TEXT NOT NULL DEFAULT 'media',  -- 'critica', 'alta', 'media', 'baixa'
  intents       TEXT[] DEFAULT '{}',    -- quais intents ativam essa regra: 'greeting', 'start_order', 'ask_price', etc. Vazio = sempre carregada
  stages        TEXT[] DEFAULT '{}',    -- quais stages ativam essa regra. Vazio = qualquer stage
  sempre_ativa  BOOLEAN DEFAULT FALSE,  -- se TRUE, é carregada em TODA interação (regras invioláveis)
  ativa         BOOLEAN DEFAULT TRUE,   -- permite desativar sem deletar
  ordem         INT DEFAULT 0,          -- ordem de exibição dentro da categoria
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_agent_rules_categoria ON public.agent_rules(categoria);
CREATE INDEX IF NOT EXISTS idx_agent_rules_ativa ON public.agent_rules(ativa);
CREATE INDEX IF NOT EXISTS idx_agent_rules_sempre_ativa ON public.agent_rules(sempre_ativa);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_agent_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_rules_updated_at ON public.agent_rules;
CREATE TRIGGER trigger_agent_rules_updated_at
  BEFORE UPDATE ON public.agent_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_rules_updated_at();

-- RLS
ALTER TABLE public.agent_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agent_rules"
  ON public.agent_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage agent_rules"
  ON public.agent_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
