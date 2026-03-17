-- ═══════════════════════════════════════════════════════════════
-- Sistema de Geolocalização + Limites de Pedidos por Zona
-- Calcula distância do estabelecimento via Haversine
-- Perto (≤5km) = 20 pedidos/dia  |  Longe (>5km) = 10 pedidos/dia
-- ═══════════════════════════════════════════════════════════════

-- 1) Adicionar colunas de geolocalização à tabela existente
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS distancia_km NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS max_pedidos_dia INTEGER NOT NULL DEFAULT 20;

-- 2) Localização do estabelecimento (Café Café Confeitaria, Osasco-SP)
--    Armazenado em crm_settings para fácil atualização
INSERT INTO crm_settings (key, value)
VALUES
  ('loja_latitude', '-23.5325'),
  ('loja_longitude', '-46.7917')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3) Função Haversine: calcula distância em km entre dois pontos
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371.0; -- raio da Terra em km
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat / 2) ^ 2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon / 2) ^ 2;
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4) Função que recalcula distância e max_pedidos para uma zona
CREATE OR REPLACE FUNCTION recalc_delivery_zone_distance()
RETURNS TRIGGER AS $$
DECLARE
  loja_lat DOUBLE PRECISION;
  loja_lon DOUBLE PRECISION;
  dist NUMERIC;
BEGIN
  SELECT value::DOUBLE PRECISION INTO loja_lat FROM crm_settings WHERE key = 'loja_latitude';
  SELECT value::DOUBLE PRECISION INTO loja_lon FROM crm_settings WHERE key = 'loja_longitude';

  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND loja_lat IS NOT NULL AND loja_lon IS NOT NULL THEN
    dist := haversine_km(loja_lat, loja_lon, NEW.latitude, NEW.longitude);
    NEW.distancia_km := dist;
    -- Perto (≤5km) = 20 pedidos | Longe (>5km) = 10 pedidos
    NEW.max_pedidos_dia := CASE WHEN dist <= 5.0 THEN 20 ELSE 10 END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Trigger: recalcula automaticamente ao inserir/atualizar coordenadas
DROP TRIGGER IF EXISTS trg_recalc_delivery_zone ON delivery_zones;
CREATE TRIGGER trg_recalc_delivery_zone
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION recalc_delivery_zone_distance();

-- 6) Adicionar referência de zona nos pedidos (delivery)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id);

ALTER TABLE encomendas
  ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id);

-- 7) Função para contar pedidos de delivery do dia numa zona
CREATE OR REPLACE FUNCTION pedidos_dia_por_zona(zone_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::INTEGER FROM orders
     WHERE delivery_zone_id = zone_id
       AND channel = 'delivery'
       AND status != 'cancelado'
       AND created_at::DATE = CURRENT_DATE)
    +
    (SELECT COUNT(*)::INTEGER FROM encomendas
     WHERE delivery_zone_id = zone_id
       AND status NOT IN ('cancelado', 'entregue')
       AND delivery_date = CURRENT_DATE),
  0);
$$ LANGUAGE sql STABLE;

-- 8) View útil: zonas com disponibilidade em tempo real
CREATE OR REPLACE VIEW delivery_zones_disponibilidade AS
SELECT
  dz.id,
  dz.bairro,
  dz.cidade,
  dz.taxa,
  dz.taxa_max,
  dz.distancia_km,
  dz.max_pedidos_dia,
  pedidos_dia_por_zona(dz.id) AS pedidos_hoje,
  dz.max_pedidos_dia - pedidos_dia_por_zona(dz.id) AS vagas_restantes,
  CASE
    WHEN pedidos_dia_por_zona(dz.id) >= dz.max_pedidos_dia THEN false
    ELSE true
  END AS disponivel
FROM delivery_zones dz
WHERE dz.ativo = true;

-- 9) Permissões: a view e funções precisam ser acessíveis pela service_role (Edge Functions)
GRANT SELECT ON delivery_zones_disponibilidade TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION haversine_km TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pedidos_dia_por_zona TO anon, authenticated, service_role;
