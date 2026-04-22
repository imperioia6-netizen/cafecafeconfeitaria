/**
 * Regressão: a mensagem para a equipe vinha do product_description livre do
 * LLM — saía tudo misturado (itens duplicados, "Sabor: em cima do bolo
 * trufado", sem a frase da escrita). buildTeamSummary agora monta tudo
 * de forma determinística: bolo → salgados → doces → obs → pagamento →
 * entrega → endereço.
 */
import { describe, it, expect } from "vitest";
import { buildTeamSummary } from "../../../supabase/functions/_shared/teamSummary.ts";

type H = { role: "user" | "assistant"; content: string };

const RECIPE_NAMES = [
  "Brigadeiro",
  "Trufado",
  "Morango",
  "Ninho com Nutella",
  "Chocolate",
];

describe("buildTeamSummary — caso real Vitor Azarias", () => {
  const history: H[] = [
    { role: "user", content: "oi queria uma encomenda" },
    { role: "assistant", content: "claro, qual sabor?" },
    { role: "user", content: "bolo trufado 2kg para quinta" },
    { role: "assistant", content: "anotado" },
    { role: "user", content: "25 mini coxinhas, 50 empadas de frango e 50 brigadeiros" },
    { role: "assistant", content: "ok" },
    { role: "user", content: "quero uma escrita em cima do bolo amo voce" },
  ];
  const items = [
    { recipe_name: "Trufado", quantity: 1, unit_type: "whole" },
    { recipe_name: "mini coxinha", quantity: 25 },
    { recipe_name: "empada de frango", quantity: 50 },
    { recipe_name: "brigadeiro", quantity: 50 },
  ];

  it("organiza por categoria e inclui escrita com a frase", () => {
    const summary = buildTeamSummary({
      customerName: "Vitor Azarias",
      customerPhone: "553599940663",
      orderType: "encomenda",
      totalValue: 506.75,
      signalPaid: true,
      deliveryDate: "quinta",
      deliveryTimeSlot: "13h",
      items,
      history,
      currentMessage: "ok",
      recipeNames: RECIPE_NAMES,
    });
    // Estrutura por categoria
    expect(summary).toMatch(/Bolo:/);
    expect(summary).toMatch(/Salgados:/);
    expect(summary).toMatch(/Doces:/);
    // Sabor correto (não "em cima do bolo trufado")
    expect(summary.toLowerCase()).toMatch(/trufado/);
    expect(summary).not.toMatch(/em cima do bolo trufado/i);
    // Peso
    expect(summary).toMatch(/2kg/);
    // Escrita com a frase literal
    expect(summary.toLowerCase()).toMatch(/escrita/);
    expect(summary).toMatch(/amo voce/i);
    // Sem duplicação: bolo aparece uma vez só, brigadeiro uma vez
    const boloCount = (summary.match(/Trufado/gi) || []).length;
    expect(boloCount).toBeLessThanOrEqual(2); // 1 no header, no máx 1 extra
    // Salgados listados
    expect(summary.toLowerCase()).toMatch(/25.*mini\s*coxinha/);
    expect(summary.toLowerCase()).toMatch(/50.*empada/);
    // Doces
    expect(summary.toLowerCase()).toMatch(/50.*brigadeiro/);
    // Pagamento
    expect(summary).toMatch(/R\$\s*506,75|R\$\s*506\.75/);
    expect(summary.toLowerCase()).toMatch(/sinal\s*50/);
    // Entrega
    expect(summary.toLowerCase()).toMatch(/quinta/);
    expect(summary).toMatch(/13h/);
    // Cliente
    expect(summary).toMatch(/Vitor Azarias/);
  });
});

describe("buildTeamSummary — dedup e categorização", () => {
  it("deduplica itens idênticos", () => {
    const summary = buildTeamSummary({
      items: [
        { recipe_name: "brigadeiro", quantity: 50 },
        { recipe_name: "brigadeiro", quantity: 50 },
        { recipe_name: "mini coxinha", quantity: 25 },
      ],
      history: [],
      currentMessage: "",
    });
    const brigCount = (summary.match(/50×\s*brigadeiro/gi) || []).length;
    expect(brigCount).toBe(1);
  });

  it("salgados ficam em 🥟 Salgados", () => {
    const summary = buildTeamSummary({
      items: [
        { recipe_name: "coxinha", quantity: 25 },
        { recipe_name: "empada", quantity: 50 },
        { recipe_name: "kibe", quantity: 25 },
      ],
      history: [],
      currentMessage: "",
    });
    expect(summary).toMatch(/Salgados/);
    expect(summary.toLowerCase()).toMatch(/coxinha/);
    expect(summary.toLowerCase()).toMatch(/empada/);
    expect(summary.toLowerCase()).toMatch(/kibe/);
  });

  it("doces ficam em 🍬 Doces", () => {
    const summary = buildTeamSummary({
      items: [
        { recipe_name: "brigadeiro", quantity: 30 },
        { recipe_name: "beijinho", quantity: 20 },
      ],
      history: [],
      currentMessage: "",
    });
    expect(summary).toMatch(/Doces/);
    expect(summary.toLowerCase()).toMatch(/brigadeiro/);
    expect(summary.toLowerCase()).toMatch(/beijinho/);
  });
});

describe("buildTeamSummary — escrita", () => {
  it("extrai 'amo voce' de 'escrita em cima do bolo amo voce'", () => {
    const summary = buildTeamSummary({
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [
        { role: "user", content: "bolo trufado 2kg" },
        {
          role: "user",
          content: "quero uma escrita em cima do bolo amo voce",
        },
      ],
      currentMessage: "",
      recipeNames: RECIPE_NAMES,
    });
    expect(summary).toMatch(/amo voce/i);
    expect(summary).toMatch(/escrita/i);
  });

  it("extrai 'Feliz Aniversário' de 'com a frase Feliz Aniversário'", () => {
    const summary = buildTeamSummary({
      items: [{ recipe_name: "Brigadeiro", quantity: 1 }],
      history: [
        {
          role: "user",
          content: "bolo brigadeiro 1kg com a frase Feliz Aniversário",
        },
      ],
      currentMessage: "",
      recipeNames: RECIPE_NAMES,
    });
    expect(summary).toMatch(/Feliz Anivers/i);
  });

  it("sem pedido de escrita → não inclui escrita no resumo", () => {
    const summary = buildTeamSummary({
      items: [{ recipe_name: "Brigadeiro", quantity: 1 }],
      history: [{ role: "user", content: "bolo brigadeiro 1kg" }],
      currentMessage: "",
      recipeNames: RECIPE_NAMES,
    });
    expect(summary).not.toMatch(/escrita/i);
  });
});

describe("buildTeamSummary — decoração", () => {
  it("inclui decoração quando cliente descreveu", () => {
    const summary = buildTeamSummary({
      items: [{ recipe_name: "Morango", quantity: 1 }],
      history: [
        {
          role: "user",
          content:
            "bolo de morango 2kg com decoração colorida com flores",
        },
      ],
      currentMessage: "",
      recipeNames: RECIPE_NAMES,
    });
    expect(summary.toLowerCase()).toMatch(/decora/);
    expect(summary.toLowerCase()).toMatch(/colorid|flores/);
  });
});

describe("buildTeamSummary — modalidade (entrega × retirada)", () => {
  it("deliveryMethod='entrega' → 🚚 ENTREGA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      deliveryMethod: "entrega",
      items: [{ recipe_name: "Brigadeiro", quantity: 1, unit_type: "whole" }],
      history: [],
      currentMessage: "",
    });
    expect(s).toMatch(/ENTREGA/);
  });

  it("deliveryMethod='retirada' → 🏪 RETIRADA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      deliveryMethod: "retirada",
      items: [{ recipe_name: "Brigadeiro", quantity: 1, unit_type: "whole" }],
      history: [],
      currentMessage: "",
    });
    expect(s).toMatch(/RETIRADA/);
  });

  it("sem deliveryMethod mas com endereço → infere ENTREGA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      address: "Rua Qualquer, 123 — Osasco",
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [],
      currentMessage: "",
    });
    expect(s).toMatch(/ENTREGA/);
  });

  it("histórico diz 'vai ser retirada' → RETIRADA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [
        { role: "user", content: "bolo trufado 2kg" },
        { role: "user", content: "vai ser retirada" },
      ],
      currentMessage: "ok",
    });
    expect(s).toMatch(/RETIRADA/);
  });

  it("histórico diz 'quero delivery' → ENTREGA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [
        { role: "user", content: "bolo trufado 2kg para encomenda" },
        { role: "user", content: "quero delivery" },
      ],
      currentMessage: "",
    });
    expect(s).toMatch(/ENTREGA/);
  });

  it("'busco na loja' → RETIRADA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [
        { role: "user", content: "bolo trufado 1kg" },
        { role: "user", content: "busco na loja" },
      ],
      currentMessage: "",
    });
    expect(s).toMatch(/RETIRADA/);
  });

  it("encomenda sem modalidade definida → flag NÃO DEFINIDA", () => {
    const s = buildTeamSummary({
      orderType: "encomenda",
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [{ role: "user", content: "bolo trufado 2kg para sábado" }],
      currentMessage: "",
    });
    expect(s).toMatch(/N[AÃ]O\s+DEFINIDA/i);
    expect(s.toLowerCase()).toMatch(/entrega\s+ou\s+retirada/);
  });

  it("tipo=pedido (não encomenda) sem modalidade → não mostra linha", () => {
    const s = buildTeamSummary({
      orderType: "pedido",
      items: [{ recipe_name: "Trufado", quantity: 1 }],
      history: [],
      currentMessage: "",
    });
    expect(s).not.toMatch(/Modalidade/i);
  });
});

describe("buildTeamSummary — fallback e robustez", () => {
  it("sem nada → usa productDescription como fallback", () => {
    const summary = buildTeamSummary({
      productDescription: "Encomenda padrão",
      history: [],
      currentMessage: "",
    });
    expect(summary).toBe("Encomenda padrão");
  });

  it("com apenas itens, sem histórico → monta corretamente", () => {
    const summary = buildTeamSummary({
      customerName: "Maria",
      items: [{ recipe_name: "Brigadeiro", quantity: 1 }],
      totalValue: 100,
      history: [],
      currentMessage: "",
    });
    expect(summary).toMatch(/Maria/);
    expect(summary.toLowerCase()).toMatch(/brigadeiro/);
    expect(summary).toMatch(/R\$\s*100/);
  });
});
