-- Tabela de zonas/bairros de delivery com taxas de entrega
-- Usada pelo atendente IA para informar automaticamente o valor da taxa
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL DEFAULT 'Osasco',
  taxa NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_max NUMERIC(10,2), -- valor máximo quando há faixa de preço
  tempo_estimado TEXT, -- ex: "30-45 min"
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca rápida por bairro
CREATE INDEX IF NOT EXISTS idx_delivery_zones_bairro ON delivery_zones (bairro);

-- RLS: leitura pública (IA precisa ler), escrita só autenticado
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de zonas de delivery"
  ON delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "Escrita autenticada em zonas de delivery"
  ON delivery_zones FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
