-- Seed: Taxas de delivery por bairro (tabela "reajuste")
-- Fonte: planilha interna Café Café Confeitaria
-- taxa = VALOR MÍN, taxa_max = VALOR MÁX (quando há faixa)
-- latitude/longitude: coordenadas aproximadas do bairro
-- O trigger trg_recalc_delivery_zone calcula distancia_km e max_pedidos_dia automaticamente
-- Referência: Café Café Confeitaria ≈ -23.5325, -46.7917 (Osasco centro)

INSERT INTO delivery_zones (bairro, cidade, taxa, taxa_max, latitude, longitude) VALUES
-- ══════════════════════ Osasco ══════════════════════
('1º de Maio',         'Osasco', 15.00, 20.00, -23.5380, -46.7750),
('Adaldisa',           'Osasco', 12.00, NULL,   -23.5400, -46.7850),
('Ayrosa',             'Osasco', 15.00, NULL,   -23.5250, -46.7800),
('Baronesa',           'Osasco', 15.00, NULL,   -23.5200, -46.7950),
('Bonfim',             'Osasco', 15.00, NULL,   -23.5280, -46.8050),
('Bradesco Matriz',    'Osasco', 10.00, NULL,   -23.5340, -46.7900),
('Bussocaba',          'Osasco', 10.00, NULL,   -23.5400, -46.7950),
('Campesina',          'Osasco', 10.00, NULL,   -23.5370, -46.7870),
('Centro de Osasco',   'Osasco', 10.00, 12.00, -23.5325, -46.7917),
('Cidade das Flores',  'Osasco', 10.00, 12.00, -23.5450, -46.7850),
('Cirino',             'Osasco', 12.00, NULL,   -23.5300, -46.7800),
('Cipava',             'Osasco',  6.00,  8.00, -23.5350, -46.7880),
('Conceição',          'Osasco', 12.00, 15.00, -23.5280, -46.7850),
('Continental',        'Osasco', 15.00, NULL,   -23.5200, -46.7650),
('Helena Maria',       'Osasco', 15.00, NULL,   -23.5400, -46.8000),
('I.A.P.I.',           'Osasco', 15.00, NULL,   -23.5250, -46.7850),
('Jaguaribe',          'Osasco', 10.00, NULL,   -23.5300, -46.7850),
('Jardim Abril',       'Osasco', 12.00, NULL,   -23.5450, -46.7750),
('Jardim Bandeiras',   'Osasco', 12.00, NULL,   -23.5380, -46.7800),
('Jardim Bela Vista',  'Osasco',  6.00,  8.00, -23.5360, -46.7900),
('Jardim Boa Vista',   'Osasco', 20.00, NULL,   -23.5200, -46.8100),
('Jardim das Flores',  'Osasco', 12.00, NULL,   -23.5380, -46.7850),
('Jardim Lago',        'Osasco', 25.00, NULL,   -23.5150, -46.8150),
('Jardim Roberto',     'Osasco', 12.00, NULL,   -23.5420, -46.7870),
('Jardim Santa Maria', 'Osasco', 15.00, NULL,   -23.5350, -46.7750),
('Jardim Santo Antônio','Osasco',10.00, 12.00, -23.5300, -46.7950),
('Jardim São Francisco','Osasco',15.00, 20.00, -23.5250, -46.7750),
('Jardim São Pedro',   'Osasco', 12.00, NULL,   -23.5380, -46.7950),
('Km 18',              'Osasco', 12.00, NULL,   -23.5200, -46.8000),
('Metalúrgicos',       'Osasco', 15.00, NULL,   -23.5350, -46.7800),
('Munhoz Júnior',      'Osasco', 15.00, NULL,   -23.5300, -46.7750),
('Mutinga',            'Osasco', 20.00, NULL,   -23.5180, -46.8150),
('Novo Osasco',        'Osasco', 10.00, 12.00, -23.5400, -46.7800),
('Padroeira',          'Osasco', 12.00, NULL,   -23.5420, -46.7950),
('Pestana',            'Osasco', 12.00, NULL,   -23.5350, -46.7850),
('Piratininga',        'Osasco', 12.00, NULL,   -23.5400, -46.7900),
('Portal do Oeste',    'Osasco', 15.00, NULL,   -23.5250, -46.8100),
('Presidente Altino',  'Osasco', 12.00, 15.00, -23.5230, -46.7870),
('Quitaúna',           'Osasco', 12.00, NULL,   -23.5280, -46.8000),
('Rochdale',           'Osasco', 15.00, NULL,   -23.5180, -46.7800),
('Umuarama',           'Osasco', 10.00, 12.00, -23.5380, -46.7950),
('Veloso',             'Osasco', 12.00, 15.00, -23.5350, -46.7950),
('Vila Menck',         'Osasco', 12.00, NULL,   -23.5280, -46.7950),
('Vila Yara',          'Osasco', 10.00, 12.00, -23.5280, -46.7780),
('Vila Yolanda',       'Osasco',  8.00, 10.00, -23.5350, -46.7850),

-- ══════════════════════ Barueri ══════════════════════
('Alphaville',         'Barueri', 30.00, NULL,  -23.4850, -46.8500),
('Barueri',            'Barueri', 30.00, NULL,  -23.5115, -46.8760),
('Parque Imperial',    'Barueri', 20.00, NULL,  -23.5050, -46.8600),

-- ══════════════════════ Carapicuíba ══════════════════════
('Carapicuíba',     'Carapicuíba', 25.00, 30.00, -23.5230, -46.8350),
('Mutinga',         'Carapicuíba', 25.00, NULL,   -23.5150, -46.8300),

-- ══════════════════════ São Paulo ══════════════════════
('Bonfiglioli',        'São Paulo', 25.00, NULL,  -23.5400, -46.7550),
('Itaim Bibi',         'São Paulo', 30.00, NULL,  -23.5870, -46.6760),
('Jaguaré',            'São Paulo', 15.00, 20.00, -23.5500, -46.7450),
('Lapa',               'São Paulo', 25.00, NULL,  -23.5230, -46.7150),
('Leopoldina',         'São Paulo', 25.00, NULL,  -23.5250, -46.7200),
('Pinheiros',          'São Paulo', 30.00, NULL,  -23.5630, -46.6920),
('Vila dos Remédios',  'São Paulo', 15.00, 20.00, -23.5200, -46.7400);
