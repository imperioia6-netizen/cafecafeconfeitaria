/**
 * Regressão do caso "quero amanha as 13hrs" / "amanhaas 13hrs" / "4kg trufado":
 *  - Agente pegou "amanha as" / "amanha as" como sabor inexistente
 *  - Perguntou forma de pagamento sem antes pedir "mais alguma coisa?"
 *  - Sabor "trufado" foi perdido depois de "4kg trufado"
 */
import { describe, it, expect } from "vitest";
import {
  messageIsAboutTime,
  enforceNoFragmentAsFlavor,
  enforceAskBeforePayment,
} from "../../../supabase/functions/_shared/priceEngine.ts";
import { buildOrderMemoryHint } from "../../../supabase/functions/_shared/conversationMemory.ts";

type H = { role: "user" | "assistant"; content: string };

const RECIPE_NAMES = ["Brigadeiro", "Trufado", "Morango", "Chocolate"];

describe("messageIsAboutTime — typos e variantes", () => {
  it("'quero amanha as 13hrs'", () => {
    expect(messageIsAboutTime("quero amanha as 13hrs")).toBe(true);
  });
  it("'amanhaas 13hrs é o horario'", () => {
    expect(messageIsAboutTime("amanhaas 13hrs é o horario")).toBe(true);
  });
  it("'amanh' (truncado)", () => {
    expect(messageIsAboutTime("pode ser amanh")).toBe(true);
  });
  it("'13hrs' (sem espaço)", () => {
    expect(messageIsAboutTime("13hrs")).toBe(true);
  });
  it("'hj' (gíria)", () => {
    expect(messageIsAboutTime("pode ser hj mesmo")).toBe(true);
  });
});

describe("enforceNoFragmentAsFlavor — typos temporais", () => {
  const MSG_LIZY = "quero amanha as 13hrs";

  it("'o sabor amanha as não temos' → pergunta aberta", () => {
    const resp = `Vitor, 🎂 O sabor "amanha as" não temos no cardápio. Nossos sabores: Bolo Brigadeiro, Bolo Trufado.`;
    const out = enforceNoFragmentAsFlavor(resp, MSG_LIZY, RECIPE_NAMES);
    expect(out).not.toMatch(/amanha as/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma/);
  });

  it("'o sabor amanhaas não temos' (typo) → pergunta aberta", () => {
    const resp = `O sabor "amanhaas" não temos no cardápio.`;
    const out = enforceNoFragmentAsFlavor(
      resp,
      "amanhaas 13hrs é o horario",
      RECIPE_NAMES
    );
    expect(out).not.toMatch(/amanhaas/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma/);
  });
});

describe("buildOrderMemoryHint — 4kg trufado extrai 'trufado'", () => {
  it("'o bolo de 4kg trufado' → SABOR: trufado", () => {
    const h: H[] = [
      {
        role: "user",
        content: "o bolo de 4kg trufado para retirada amanha as 13hrs",
      },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/SABOR:\s*trufado/i);
  });

  it("'quero 2kg brigadeiro' → SABOR: brigadeiro", () => {
    const h: H[] = [{ role: "user", content: "quero 2kg brigadeiro" }];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/SABOR:\s*brigadeiro/i);
  });
});

describe("enforceAskBeforePayment — pergunta forma de pagamento sem 'mais alguma coisa?'", () => {
  const HIST: H[] = [
    { role: "user", content: "quero bolo trufado 4kg" },
    { role: "assistant", content: "Anotado! Alguma coisa mais?" },
    { role: "user", content: "o bolo de 4kg trufado para retirada amanha as 13hrs" },
  ];

  it("'Anotado! Como vai ser o pagamento, PIX ou na loja?' → substitui por pergunta de continuidade", () => {
    const resp = "Anotado! Só preciso confirmar: como vai ser o pagamento, PIX ou na loja? 😊";
    const out = enforceAskBeforePayment(
      resp,
      "o bolo de 4kg trufado para retirada amanha as 13hrs",
      HIST
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
    expect(out).not.toMatch(/pagamento.*PIX/i);
    expect(out).not.toMatch(/PIX\s+ou\s+na\s+loja/i);
  });

  it("'Prefere pagar com PIX ou dinheiro?' → substitui", () => {
    const out = enforceAskBeforePayment(
      "Prefere pagar com PIX ou dinheiro?",
      "bolo trufado 2kg",
      []
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
  });

  it("'Forma de pagamento?' → substitui", () => {
    const out = enforceAskBeforePayment(
      "Anotado. Qual a forma de pagamento?",
      "bolo trufado",
      []
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
  });

  it("cliente JÁ disse 'pode fechar' → liberado perguntar pagamento", () => {
    const resp = "Perfeito! Como vai ser o pagamento, PIX ou dinheiro?";
    const out = enforceAskBeforePayment(resp, "pode fechar", []);
    expect(out).toBe(resp);
  });

  it("cliente disse 'só isso' → passa intacto", () => {
    const resp = "Ótimo! Prefere pagar com PIX?";
    const out = enforceAskBeforePayment(resp, "só isso", []);
    expect(out).toBe(resp);
  });
});
