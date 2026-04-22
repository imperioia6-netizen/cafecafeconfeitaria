/**
 * catalog.ts — Catálogo LITERAL do Café Café Confeitaria.
 *
 * Fonte única de verdade extraída do Obsidian Vault (`cardapio/` + `restricoes/`).
 * Usado como fallback/validação pelo agentInterpreter quando o DB está
 * parcialmente preenchido. Dados NUNCA devem ser alterados — se mudar preço
 * ou sabor, o proprietário edita o Vault e replica aqui.
 *
 * Essa é a RAZÃO do "nunca inventar": se está aqui, existe. Se não está,
 * não existe.
 */

// ── Tipos ──

export type CakeFlavor = { name: string; pricePerKg: number };

export type MiniSavory = { name: string; pricePerHundred: number };

export type LargeSavory = { name: string; unitPrice: number; category: "tradicional" | "especial" | "empada" | "quiche" };

export type SweetUnit = { name: string };

export type Beverage = { name: string; variant?: string; price: number };

// ── Bolos (R$/kg) ──
// Fonte: Obsidian Vault/cardapio/bolos.md

export const BOLOS: CakeFlavor[] = [
  // R$102/kg
  { name: "Brigadeiro", pricePerKg: 102 },
  { name: "Cocada", pricePerKg: 102 },
  { name: "Crocante", pricePerKg: 102 },
  { name: "Mousse de Limão", pricePerKg: 102 },
  { name: "Mousse de Maracujá", pricePerKg: 102 },
  { name: "Pêssego com Creme", pricePerKg: 102 },
  { name: "Prestígio", pricePerKg: 102 },
  // R$115/kg
  { name: "Abacaxi com Creme", pricePerKg: 115 },
  { name: "Abacaxi com Doce de Leite", pricePerKg: 115 },
  { name: "Ameixa com Doce de Leite", pricePerKg: 115 },
  { name: "Morango", pricePerKg: 115 },
  { name: "Bem Casado", pricePerKg: 115 },
  { name: "Bicho de Pé", pricePerKg: 115 },
  { name: "Brigadeiro com Mousse de Maracujá", pricePerKg: 115 },
  { name: "Casadinho", pricePerKg: 115 },
  { name: "Dois Amores", pricePerKg: 115 },
  { name: "Floresta Branca", pricePerKg: 115 },
  { name: "Floresta Negra", pricePerKg: 115 },
  { name: "Frutas", pricePerKg: 115 },
  { name: "Merengue", pricePerKg: 115 },
  { name: "Mousse de Chocolate", pricePerKg: 115 },
  { name: "Sonho de Valsa", pricePerKg: 115 },
  // R$129/kg
  { name: "Bicho de Pé com Brigadeiro", pricePerKg: 129 },
  { name: "Bicho de Pé com Morango", pricePerKg: 129 },
  { name: "Chocomix", pricePerKg: 129 },
  { name: "Maracujá com Coco", pricePerKg: 129 },
  { name: "Iogurte com Morango", pricePerKg: 129 },
  { name: "Limão com Chocolate", pricePerKg: 129 },
  { name: "Mousse Chocolate Preto e Branco", pricePerKg: 129 },
  { name: "Mousse Chocolate Branco", pricePerKg: 129 },
  { name: "Nozes", pricePerKg: 129 },
  { name: "Olho de Sogra", pricePerKg: 129 },
  { name: "Paçoca", pricePerKg: 129 },
  { name: "Alpes Suíço", pricePerKg: 129 },
  { name: "Beghui", pricePerKg: 129 },
  { name: "Ninho", pricePerKg: 129 },
  { name: "Ninho com Abacaxi", pricePerKg: 129 },
  { name: "Letícia", pricePerKg: 129 },
  { name: "Trufado", pricePerKg: 129 },
  { name: "Trufado Branco", pricePerKg: 129 },
  { name: "Delícia de Coco", pricePerKg: 129 },
  { name: "Brigadeiro Branco", pricePerKg: 129 },
  { name: "Camafeu de Nozes", pricePerKg: 129 },
];

/** Sabores de bolo com fruta — NÃO sugerir para encomenda (frescor 24h). */
export const BOLOS_COM_FRUTA = new Set([
  "Abacaxi com Creme",
  "Abacaxi com Doce de Leite",
  "Morango",
  "Bicho de Pé",
  "Bicho de Pé com Brigadeiro",
  "Bicho de Pé com Morango",
  "Brigadeiro com Mousse de Maracujá",
  "Floresta Negra",
  "Frutas",
  "Iogurte com Morango",
  "Limão com Chocolate",
  "Maracujá com Coco",
  "Merengue",
  "Mousse de Limão",
  "Mousse de Maracujá",
  "Ninho com Abacaxi",
  "Pêssego com Creme",
].map((n) => n.toLowerCase()));

// ── Mini salgados (cento) ──
// Fonte: Obsidian Vault/cardapio/mini-salgados.md

export const MINI_SALGADOS: MiniSavory[] = [
  { name: "Mini coxinha", pricePerHundred: 175 },
  { name: "Mini kibe", pricePerHundred: 175 },
  { name: "Mini risoles", pricePerHundred: 175 },
  { name: "Mini bolinho de carne", pricePerHundred: 175 },
  { name: "Mini bolinho de queijo", pricePerHundred: 175 },
  { name: "Mini esfiha de carne", pricePerHundred: 175 },
  { name: "Mini esfiha de frango", pricePerHundred: 175 },
  { name: "Mini esfiha de calabresa", pricePerHundred: 175 },
  { name: "Mini empada de frango", pricePerHundred: 190 },
  { name: "Mini empada de palmito", pricePerHundred: 190 },
];

/** Mini salgados que NÃO EXISTEM — frases comuns que o cliente pode pedir. */
export const MINI_NAO_EXISTEM = [
  "mini coxinha com catupiry",
  "mini 3 queijos",
  "mini enroladinho",
  "mini hamburgao",
  "mini hambúrgão",
  "mini hamburguer",
  "mini pão de batata",
  "mini pao de batata",
];

// ── Salgados grandes (unidade) ──
// Fonte: Obsidian Vault/cardapio/salgados.md

export const SALGADOS_GRANDES: LargeSavory[] = [
  // Tradicionais R$13
  { name: "Coxinha", unitPrice: 13, category: "tradicional" },
  { name: "Risoles", unitPrice: 13, category: "tradicional" },
  { name: "Bolinho de carne", unitPrice: 13, category: "tradicional" },
  { name: "Esfiha de carne", unitPrice: 13, category: "tradicional" },
  { name: "Esfiha de frango", unitPrice: 13, category: "tradicional" },
  { name: "Esfiha de calabresa", unitPrice: 13, category: "tradicional" },
  { name: "3 queijos", unitPrice: 13, category: "tradicional" },
  { name: "Enroladinho", unitPrice: 13, category: "tradicional" },
  { name: "Hamburgão", unitPrice: 13, category: "tradicional" },
  // Especiais R$15
  { name: "Coxinha com catupiry", unitPrice: 15, category: "especial" },
  { name: "Kibe", unitPrice: 15, category: "especial" },
  { name: "Pão de batata", unitPrice: 15, category: "especial" },
  // Empadas R$17
  { name: "Empada de palmito", unitPrice: 17, category: "empada" },
  { name: "Empada de frango com catupiry", unitPrice: 17, category: "empada" },
  { name: "Empada de carne seca", unitPrice: 17, category: "empada" },
  { name: "Empada 3 queijos", unitPrice: 17, category: "empada" },
  // Quiches R$17
  { name: "Quiche de brócolis", unitPrice: 17, category: "quiche" },
  { name: "Quiche de alho poró", unitPrice: 17, category: "quiche" },
  { name: "Quiche de queijo", unitPrice: 17, category: "quiche" },
];

// ── Doces (unidade) ──
// Fonte: Obsidian Vault/cardapio/doces.md — R$1,90/un, múltiplo de 25.

export const DOCES: SweetUnit[] = [
  { name: "Brigadeiro" },
  { name: "Beijinho" },
  { name: "Bicho de pé" },
  { name: "Olho de sogra" },
];
export const DOCE_PRECO_UNIDADE = 1.9;
export const DOCE_MULTIPLO = 25;

// ── Bebidas ──
// Fonte: Obsidian Vault/cardapio/bebidas.md

export const BEBIDAS: Beverage[] = [
  { name: "Refrigerante", variant: "Lata", price: 8 },
  { name: "Refrigerante", variant: "600ml", price: 13 },
  { name: "Refrigerante", variant: "2L", price: 20 },
  { name: "Suco Del Valle", variant: "1L", price: 15 },
  { name: "Suco Del Valle", variant: "lata", price: 7.5 },
  { name: "Suco natural", variant: "pequeno", price: 15 },
  { name: "Suco natural", variant: "grande", price: 25 },
  { name: "Água", price: 5 },
  { name: "Água com gás", price: 6 },
  { name: "Água de coco", price: 9 },
  { name: "Toddynho", price: 6 },
  { name: "H2O", price: 13 },
];

// ── Fatias, decoração, taxas fixas ──

export const FATIA_PRECO = 25;
export const CENTO_MINI_SALGADO = 175;
export const CENTO_MINI_EMPADA = 190;
export const SALGADOS_MULTIPLO = 25;
export const DECORACAO_COLORIDA = 30;
export const ESCRITA_PERSONALIZADA = 15;
export const PAPEL_DE_ARROZ = 25;
export const MINIMO_DELIVERY = 50;
export const LIMIAR_SINAL_50 = 300;
export const LIMITE_BOLO_DELIVERY_KG = 3;
export const LIMITE_FORMA_KG = 4;
export const ANTECEDENCIA_MIN_HORAS = 4;
export const HORARIO_LOJA_INICIO = "07:30";
export const HORARIO_LOJA_FIM = "19:30";
export const HORARIO_DELIVERY_INICIO = "09:00";

// ── PIX ──

export const PIX_CHAVE = "11998287836";
export const PIX_BANCO = "Nubank";
export const PIX_TITULAR = "Sandra Regina";

// ── Endereço da loja ──

export const ENDERECO_LOJA = "Av. Santo Antônio, 2757 - Vila Osasco, Osasco - SP, CEP 06083-215";

// ── Taxas de entrega por bairro ──
// Fonte: Obsidian Vault/restricoes/taxas.md

export const TAXAS_DELIVERY: Record<string, number | "CONSULTAR"> = {
  // Osasco R$10
  "cipava": 10,
  "jardim bela vista": 10,
  "vila yolanda": 10,
  // Osasco R$12
  "centro": 12,
  "centro de osasco": 12,
  "jaguaribe": 12,
  "jardim das flores": 12,
  // Osasco R$15
  "adaldisa": 15,
  "bradesco matriz": 15,
  "bussocaba": 15,
  "campesina": 15,
  "cidade das flores": 15,
  "cirino": 15,
  "conceicao": 15,
  "conceição": 15,
  "continental": 15,
  "jardim abril": 15,
  "jardim bandeiras": 15,
  "jardim roberto": 15,
  "jardim santo antonio": 15,
  "jardim santo antônio": 15,
  "jardim sao pedro": 15,
  "jardim são pedro": 15,
  "km 18": 15,
  "novo osasco": 15,
  "padroeira": 15,
  "pestana": 15,
  "piratininga": 15,
  "portal do oeste": 15,
  "presidente altino": 15,
  "quitauna": 15,
  "umuarama": 15,
  "veloso": 15,
  "vila yara": 15,
  // Osasco R$20
  "1o de maio": 20,
  "1º de maio": 20,
  "primeiro de maio": 20,
  "ayrosa": 20,
  "baronesa": 20,
  "bonfim": 20,
  "helena maria": 20,
  "iapi": 20,
  "jardim boa vista": 20,
  "jardim santa maria": 20,
  "jardim sao francisco": 20,
  "jardim são francisco": 20,
  "metalurgicos": 20,
  "metalúrgicos": 20,
  "munhoz junior": 20,
  "munhoz júnior": 20,
  "rochdale": 20,
  "vila menck": 20,
  // Osasco R$25
  "vl lageado": 25,
  "vila lageado": 25,
  // São Paulo R$20
  "jaguare": 20,
  "jaguaré": 20,
  "vila dos remedios": 20,
  "vila dos remédios": 20,
  // São Paulo R$30
  "pinheiros": 30,
  "itaim bibi": 30,
  // Consultar
  "bonfiglioli": "CONSULTAR",
  "lapa": "CONSULTAR",
  "leopoldina": "CONSULTAR",
  "alphaville": "CONSULTAR",
  "barueri": "CONSULTAR",
  "parque imperial": "CONSULTAR",
  "carapicuiba": "CONSULTAR",
  "carapicuíba": "CONSULTAR",
  "mutinga": "CONSULTAR",
};

// ── Produtos / serviços que NÃO FAZEMOS ──
// Fonte: Obsidian Vault/restricoes/produtos-que-nao-fazemos.md

export const NAO_FAZEMOS: string[] = [
  "mini coxinha com catupiry",
  "peso quebrado de bolo",
  "link de pagamento",
  "parcelamento no credito",
  "atendimento por audio",
  "atendimento por ligacao",
];

// ── Helpers de categorização ──

/** Retorna todos os nomes (lowercased, sem acento) do cardápio de bolos. */
export function getAllCakeNames(): string[] {
  return BOLOS.map((b) => b.name);
}

/** Retorna todos os nomes do cardápio (bolos + mini + grandes + doces). */
export function getAllProductNames(): string[] {
  return [
    ...BOLOS.map((b) => b.name),
    ...MINI_SALGADOS.map((m) => m.name),
    ...SALGADOS_GRANDES.map((s) => s.name),
    ...DOCES.map((d) => d.name),
  ];
}

/** Busca preço/kg de bolo pelo nome (case/acento insensível). */
export function findCakeFlavor(query: string): CakeFlavor | null {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!q) return null;
  return (
    BOLOS.find((b) => {
      const n = b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n === q;
    }) ?? null
  );
}
