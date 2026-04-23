/**
 * v241-2 — trava as 4 decisões do proprietário no prompt contra regressão.
 *
 * O proprietário respondeu 4 dúvidas de contradições:
 *   1. Saudação + pedido aberto → pergunta "continuar ou novo?". Se já
 *      confirmado/finalizado → cumprimento novo sem mencionar anterior.
 *   2. Bolo 4kg em encomenda → RETIRADA direto, informa uma vez, não
 *      repete.
 *   3. 3 modalidades (delivery/retirada/encomenda) têm significados
 *      distintos — delivery e retirada = vitrine, encomenda = sob demanda.
 *   4. Mensagem com múltiplos elementos → validar cada um contra cardápio;
 *      se algum inválido, explicar SÓ esse e anotar o resto.
 */
import { describe, it, expect } from "vitest";
import { buildSmartPrompt } from "../../../supabase/functions/_shared/decisionLayer.ts";
import type { DecisionContext } from "../../../supabase/functions/_shared/decisionLayer.ts";

function ctx(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    notasRelevantes: "",
    calculosTexto: "",
    alertas: [],
    paymentInfo: "PIX: 11998287836",
    customInstructions: "",
    cardapioDetalhado: "- Brigadeiro 1kg: R$102",
    deliveryZonesTexto: "",
    promoSummary: "",
    cardapioAcai: "",
    cardapioNomes: "Brigadeiro",
    contactName: "",
    intent: "unknown" as const,
    ...overrides,
  };
}

describe("Prompt — decisão 1 (saudação + pedido aberto/finalizado)", () => {
  const p = buildSmartPrompt(ctx());

  it("contém os 3 cenários A/B/C explícitos", () => {
    expect(p).toMatch(/CEN[AÁ]RIO A/i);
    expect(p).toMatch(/CEN[AÁ]RIO B/i);
    expect(p).toMatch(/CEN[AÁ]RIO C/i);
  });

  it("cenário B (pedido em aberto) pede para perguntar 'continuar ou novo'", () => {
    const idx = p.indexOf("CENÁRIO B");
    const bloco = p.slice(idx, idx + 600);
    expect(bloco.toLowerCase()).toMatch(/continuar|novo/);
    expect(bloco.toLowerCase()).toMatch(/pedido em aberto/);
  });

  it("cenário C (pedido já confirmado) proíbe perguntar 'continuar pedido anterior'", () => {
    const idx = p.indexOf("CENÁRIO C");
    const bloco = p.slice(idx, idx + 700);
    expect(bloco.toLowerCase()).toMatch(/confirmado|finalizado|entregue|em produ[cç][aã]o/);
    expect(bloco.toLowerCase()).toMatch(/n[aã]o pergunte|n[aã]o reative/);
  });
});

describe("Prompt — decisão 2 (4kg = retirada direto, sem repetir)", () => {
  const p = buildSmartPrompt(ctx());

  it("marca exceção 4kg como retirada forçada", () => {
    expect(p).toMatch(/4kg/i);
    const idx = p.search(/EXCE[CÇ][AÃ]O.*4[Kk][Gg]|PEDIDO TEM BOLO 4[Kk][Gg]/);
    expect(idx).toBeGreaterThan(0);
  });

  it("manda informar 4kg APENAS UMA VEZ e não repetir", () => {
    expect(p).toMatch(/UMA VEZ/i);
    expect(p).toMatch(/n[aã]o repita|n[aã]o fique repetindo/i);
  });

  it("elimina a antiga dupla-regra conflitante (duas seções sobre encomenda/4kg)", () => {
    // Antes existiam 2 blocos: "ENTREGA DE ENCOMENDAS" + "ENCOMENDA — ANTES
    // DE FINALIZAR" com instruções ligeiramente diferentes. Só pode existir
    // UM agora.
    const matches = p.match(/ENTREGA DE ENCOMENDAS/gi) || [];
    expect(matches.length).toBeLessThanOrEqual(1);
    expect(p).not.toMatch(/ENCOMENDA —? ANTES DE FINALIZAR/i);
  });
});

describe("Prompt — decisão 3 (3 modalidades com significados claros)", () => {
  const p = buildSmartPrompt(ctx());

  it("explica delivery = vitrine entregue na casa", () => {
    const idx = p.indexOf("DELIVERY = produto da VITRINE");
    expect(idx).toBeGreaterThan(0);
  });

  it("explica retirada = vitrine mas cliente busca na loja", () => {
    const idx = p.indexOf("RETIRADA = produto da VITRINE que o CLIENTE vai buscar");
    expect(idx).toBeGreaterThan(0);
  });

  it("explica encomenda = sob demanda com data/hora", () => {
    const idx = p.indexOf("ENCOMENDA = produto feito SOB DEMANDA");
    expect(idx).toBeGreaterThan(0);
  });

  it("inclui o template explicativo para cliente em dúvida", () => {
    expect(p).toMatch(/QUANDO O CLIENTE FICA EM D[UÚ]VIDA/i);
    expect(p.toLowerCase()).toMatch(/qual é o seu caso/);
  });
});

describe("Prompt — decisão 4 (validação parcial: valida, anota válido, explica inválido)", () => {
  const p = buildSmartPrompt(ctx());

  it("contém o protocolo de validação parcial", () => {
    expect(p).toMatch(/PROTOCOLO DE VALIDAÇÃO PARCIAL/i);
  });

  it("dá exemplo de tudo-válido ('morango 3kg amanhã 14h')", () => {
    const idx = p.indexOf("morango 3kg pra amanhã às 14h");
    expect(idx).toBeGreaterThan(0);
  });

  it("dá exemplo de parcialmente-inválido ('nutella' dentro de frase boa)", () => {
    expect(p.toLowerCase()).toContain("nutella");
    // Procura a menção de "nutella" no contexto de validação parcial
    // (frase "quero um bolo de 3kg de nutella..."). Há outras menções
    // a "nutella" no prompt (ex.: bloco sobre sabor fora do cardápio em
    // v244), então buscamos especificamente o padrão da seção 4.
    const validacaoIdx = p.search(/quero um bolo de 3kg de nutella/i);
    expect(validacaoIdx).toBeGreaterThan(0);
    const section = p.slice(validacaoIdx, validacaoIdx + 500);
    // A ação correta é explicar SÓ o problema e anotar o resto
    expect(section.toLowerCase()).toMatch(/anotei|anotado/);
    expect(section.toLowerCase()).toMatch(/n[aã]o refa[cç]a|s[oó] resolva/);
  });

  it("instrui validar SABOR contra cardápio letra por letra", () => {
    expect(p).toMatch(/letra por letra/i);
  });

  it("diferencia brigadeiro BOLO vs DOCINHO pela quantidade", () => {
    // Cliente diz "50 brigadeiros" (qtd alta) → docinho, não bolo
    expect(p).toMatch(/brigadeir[oas].*ambíguo|brigadeiro.*bolo.*docinho|Brigadeir.*AMB[IÍ]GUO/i);
    expect(p.toLowerCase()).toMatch(/quantidade/);
  });
});

describe("Prompt — integridade geral", () => {
  const p = buildSmartPrompt(ctx());

  it("tamanho não inflou absurdamente (< 50k chars, baseline ~40k)", () => {
    // Guarda contra regressão que insira blocos enormes. Com cardápio
    // dinâmico a função cresce até ~45k, então 50k é teto razoável.
    expect(p.length).toBeLessThan(50_000);
  });

  it("ainda contém as 8 regras críticas no topo", () => {
    expect(p).toMatch(/⚠️ REGRAS CRÍTICAS — NUNCA QUEBRE/);
    expect(p).toMatch(/PROIBIDO INVENTAR/);
    expect(p).toMatch(/VALIDAÇÃO INTERNA/);
  });

  it("mantém as categorias de produto (fix 5 do v241)", () => {
    expect(p).toMatch(/CATEGORIAS DE PRODUTO/);
    expect(p).toMatch(/🎂 BOLOS/);
    expect(p).toMatch(/🥟 SALGADOS/);
    expect(p).toMatch(/🍬 DOCINHOS/);
  });
});
