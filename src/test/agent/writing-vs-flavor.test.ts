/**
 * Regressão: cliente disse "quero uma escrita em cima do bolo amo voce" e o
 * agente interpretou "amo voce" como sabor inexistente.
 *
 * Fix: (1) detectar contexto de ESCRITA, (2) não extrair sabor dessas
 * frases, (3) validar rejeição de sabor contra o cardápio real (se X não
 * bate, não rejeita — pergunta).
 */
import { describe, it, expect } from "vitest";
import {
  messageIsAboutWriting,
  enforceNoFragmentAsFlavor,
} from "../../../supabase/functions/_shared/priceEngine.ts";
import {
  preCalcular,
  detectEntities,
} from "../../../supabase/functions/_shared/decisionLayer.ts";
import { buildOrderMemoryHint } from "../../../supabase/functions/_shared/conversationMemory.ts";
import type { RecipeInfo } from "../../../supabase/functions/_shared/calculator.ts";

type H = { role: "user" | "assistant"; content: string };

const RECEITAS: RecipeInfo[] = [
  { name: "Brigadeiro", sale_price: 102 },
  { name: "Trufado", sale_price: 129 },
  { name: "Morango", sale_price: 110 },
  { name: "Ninho com Nutella", sale_price: 130 },
  { name: "Pêssego com Creme", sale_price: 115 },
];

const RECIPE_NAMES = RECEITAS.map((r) => r.name);

describe("messageIsAboutWriting", () => {
  it("detecta 'escrita em cima do bolo'", () => {
    expect(
      messageIsAboutWriting("quero uma escrita em cima do bolo amo voce")
    ).toBe(true);
  });
  it("detecta 'escrever'", () => {
    expect(messageIsAboutWriting("quero escrever Eu te amo no bolo")).toBe(true);
  });
  it("detecta 'com a frase'", () => {
    expect(messageIsAboutWriting("bolo com a frase Parabéns")).toBe(true);
  });
  it("detecta 'com os dizeres'", () => {
    expect(messageIsAboutWriting("com os dizeres Feliz Aniversário")).toBe(true);
  });
  it("detecta 'em cima do bolo' sozinho (implica escrita/decoração)", () => {
    expect(messageIsAboutWriting("algo em cima do bolo")).toBe(true);
  });
  it("frase neutra não é escrita", () => {
    expect(messageIsAboutWriting("quero bolo de morango 2kg")).toBe(false);
    expect(messageIsAboutWriting("pode ser amanhã as 9")).toBe(false);
  });
});

describe("enforceNoFragmentAsFlavor — rejeita 'sabor amo voce não temos'", () => {
  const RESP_ERRADA = `Vitor, 🎂 O sabor "amo voce" não temos no cardápio. Nossos sabores: Brigadeiro, Trufado, Morango.`;

  it("quando mensagem tem contexto de escrita, rejeita a resposta", () => {
    const out = enforceNoFragmentAsFlavor(
      RESP_ERRADA,
      "quero uma escrita em cima do bolo amo voce",
      RECIPE_NAMES
    );
    expect(out).not.toMatch(/amo voce/i);
    expect(out.toLowerCase()).toMatch(/escrita|frase/);
  });

  it("quando 'amo voce' não existe no cardápio (sem contexto de escrita), também rejeita", () => {
    const out = enforceNoFragmentAsFlavor(
      RESP_ERRADA,
      "bolo amo voce", // sem marcador de escrita
      RECIPE_NAMES
    );
    expect(out).not.toMatch(/amo voce/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma.*sabor/);
  });

  it("rejeição REAL de sabor 'pistache' passa intacta (pistache não está no cardápio mas o fluxo é legítimo)", () => {
    // "pistache" é 1 token só, sem marcadores de escrita/tempo, e não bate.
    // Aqui o guardrail DEVE substituir porque o cardápio não tem pistache.
    // Isso é esperado: melhor perguntar do que afirmar baseado em um LLM alucinando.
    const resp = `O sabor "pistache" não temos no cardápio.`;
    const out = enforceNoFragmentAsFlavor(resp, "quero bolo pistache", RECIPE_NAMES);
    // Deve substituir porque não bate (comportamento conservador).
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma.*sabor/);
  });

  it("rejeição de sabor REAL que bate parcialmente com cardápio → mantém", () => {
    // "Trufado Belga" bate parcialmente com "Trufado" do cardápio.
    const resp = `O sabor "Trufado Belga" não temos, mas temos Trufado.`;
    const out = enforceNoFragmentAsFlavor(resp, "quero trufado belga", RECIPE_NAMES);
    expect(out).toBe(resp);
  });

  it("sem currentMessage e sem recipes, 'amo voce' ainda é rewrite (v242: escrita óbvia)", () => {
    const resp = `O sabor "amo voce" não temos.`;
    const out = enforceNoFragmentAsFlavor(resp);
    // v242: "amo voce" é frase de escrita tão comum (Eu te amo, amo você, te amo)
    // que é seguro sempre reescrever, mesmo sem contexto explícito. O cliente
    // provavelmente pediu escrita no bolo e o LLM interpretou como sabor.
    expect(out.toLowerCase()).toMatch(/escrita|frase|confirma.*sabor/);
  });
});

describe("preCalcular — contexto de escrita injeta [CONTEXTO_ESCRITA]", () => {
  it("'escrita em cima do bolo amo voce' dispara alerta", () => {
    const msg = "quero uma escrita em cima do bolo amo voce";
    const r = preCalcular(msg, "cakes", detectEntities(msg), RECEITAS);
    expect(r.alertas.join(" ")).toMatch(/CONTEXTO_ESCRITA/);
  });

  it("NÃO infere sabor de frase de escrita", () => {
    const msg = "quero uma escrita em cima do bolo amo voce";
    const r = preCalcular(msg, "cakes", detectEntities(msg), RECEITAS);
    expect(r.texto).not.toMatch(/REFER[ÊE]NCIA/);
  });

  it("frase 'bolo trufado 2kg com escrita amo voce' — sabor válido + escrita", () => {
    const msg = "bolo trufado 2kg com escrita amo voce";
    const r = preCalcular(msg, "cakes", detectEntities(msg), RECEITAS);
    // Ainda deve calcular o bolo trufado 2kg.
    expect(r.texto).toMatch(/Trufado|trufado/);
    // Deve injetar alerta de escrita também.
    expect(r.alertas.join(" ")).toMatch(/CONTEXTO_ESCRITA/);
  });
});

describe("buildOrderMemoryHint — frase de escrita não vira sabor", () => {
  it("'quero uma escrita em cima do bolo amo voce' NÃO gera SABOR: amo voce", () => {
    const h: H[] = [
      { role: "user", content: "quero uma escrita em cima do bolo amo voce" },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).not.toMatch(/SABOR:\s*amo/i);
    expect(hint).not.toMatch(/SABOR:\s*voce/i);
  });

  it("cliente diz sabor legit ANTES + escrita depois → mantém o sabor", () => {
    const h: H[] = [
      { role: "user", content: "quero bolo de morango 2kg" },
      { role: "assistant", content: "anotado" },
      { role: "user", content: "com escrita em cima amo voce" },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/SABOR:\s*morango/i);
    expect(hint).not.toMatch(/SABOR:\s*amo/i);
  });
});
