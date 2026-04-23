/**
 * v244 — proíbe frases de dribagem ("enquanto isso", "já te retorno...").
 *
 * Screenshot real: cliente pediu "Cenoura" (sabor fora do cardápio). LLM
 * respondeu "Vou verificar com a equipe se conseguimos fazer [produto do
 * cardápio]! 😊 Enquanto isso, vamos dividir em 4kg+1kg...". A limpeza
 * de placeholder removeu a 1ª frase, sobrou só "😊 Enquanto isso..." —
 * o cliente percebeu como dribagem (com razão: o sabor pedido foi ignorado).
 *
 * Fixes:
 *  1. enforceNoStallPhrases: detecta frases de dribagem. Quando cliente
 *     falou sabor FORA do cardápio + LLM está dribando, substitui por
 *     resposta clara citando o nome do sabor e oferecendo alternativas.
 *  2. enforceNoTemplatePlaceholders: se limpeza inline deixa texto que
 *     começa com "enquanto isso" / "porém" / "além disso" (conector órfão),
 *     cai no fallback em vez de manter frase decapitada.
 */
import { describe, it, expect } from "vitest";
import {
  enforceNoStallPhrases,
  enforceNoTemplatePlaceholders,
} from "../../../supabase/functions/_shared/priceEngine.ts";

const RECIPE_NAMES = [
  "Brigadeiro",
  "Trufado",
  "Morango",
  "Ninho com Nutella",
  "Chocomix",
  "Sonho de Valsa",
];

describe("enforceNoStallPhrases — cliente falou sabor fora do cardápio + dribagem", () => {
  it("'Cenoura' + 'Enquanto isso, vamos dividir 4kg+1kg' → substitui", () => {
    const reply =
      "😊 Enquanto isso, como o pedido tem 5kg, vamos dividir em duas formas (4kg + 1kg). A encomenda vai ser entrega ou retirada?";
    const out = enforceNoStallPhrases(reply, "Cenoura", RECIPE_NAMES);
    expect(out.toLowerCase()).toContain("cenoura");
    expect(out.toLowerCase()).toMatch(/n[aã]o tem|n[aã]o temos/);
    expect(out).toMatch(/Brigadeiro|Trufado|Morango/);
    expect(out.toLowerCase()).not.toContain("enquanto isso");
  });

  it("'Abacate' + 'Já te retorno com a confirmação' → substitui", () => {
    const reply = "Perfeito! Já te retorno com a confirmação e o valor, tá bom?";
    const out = enforceNoStallPhrases(reply, "Abacate", RECIPE_NAMES);
    expect(out.toLowerCase()).toContain("abacate");
    expect(out.toLowerCase()).toMatch(/n[aã]o tem|n[aã]o temos/);
    expect(out.toLowerCase()).not.toContain("já te retorno");
  });

  it("'Banana' + 'aguarda um momento' → substitui", () => {
    const reply = "Aguarda um momento, já volto.";
    const out = enforceNoStallPhrases(reply, "Banana", RECIPE_NAMES);
    expect(out.toLowerCase()).toContain("banana");
    expect(out.toLowerCase()).not.toContain("aguarda um momento");
  });
});

describe("enforceNoStallPhrases — resposta começa com 'enquanto isso' órfão", () => {
  it("'😊 Enquanto isso, mais alguma coisa?' curto → substitui", () => {
    const reply = "😊 Enquanto isso, gostaria de mais alguma coisa?";
    const out = enforceNoStallPhrases(reply, "oi", RECIPE_NAMES);
    expect(out.toLowerCase()).not.toContain("enquanto isso");
  });

  it("'Enquanto isso, me diz a data' (< 150 chars) → substitui", () => {
    const reply = "Enquanto isso, me diz a data.";
    const out = enforceNoStallPhrases(reply, "encomenda", RECIPE_NAMES);
    expect(out.toLowerCase()).not.toContain("enquanto isso");
  });
});

describe("enforceNoStallPhrases — casos que NÃO devem mexer", () => {
  it("resposta sem dribagem → passa intacta", () => {
    const reply = "Beleza! Anotado: bolo de Morango 2kg. Mais alguma coisa?";
    const out = enforceNoStallPhrases(reply, "morango", RECIPE_NAMES);
    expect(out).toBe(reply);
  });

  it("cliente falou sabor REAL ('morango') + 'enquanto isso' na resposta → ainda substitui o stall, mas não faz mensagem de sabor inexistente", () => {
    // "morango" É do cardápio. Então não é caso de sabor-inexistente.
    // Mas se é resposta curta começando com "enquanto isso", ainda substitui.
    const reply = "Enquanto isso me diz o peso, por favor?";
    const out = enforceNoStallPhrases(reply, "morango", RECIPE_NAMES);
    // Substituição de stall orphan acontece; mas sem mencionar "morango não tem"
    expect(out.toLowerCase()).not.toContain("morango a gente não tem");
    expect(out.toLowerCase()).not.toContain("enquanto isso");
  });

  it("cliente mandou modalidade ('encomenda', 'retirada'), SEM sabor fora do cardápio + resposta longa com 'enquanto isso' → passa", () => {
    const reply =
      "Perfeito! Vamos seguir: anotado bolo de morango 2kg. Enquanto isso, me confirma se quer adicionar decoração pra ficar mais bonito. Podemos fazer o tema que você quiser.";
    const out = enforceNoStallPhrases(reply, "encomenda", RECIPE_NAMES);
    // Resposta > 150 chars + não é sabor fora do cardápio → preserva
    expect(out).toBe(reply);
  });
});

describe("enforceNoTemplatePlaceholders — órfão 'enquanto isso' cai no fallback", () => {
  it("só sobra '😊 Enquanto isso, ...' depois de remover placeholder → fallback", () => {
    // Essa é a situação exata da screenshot
    const input =
      "Vou verificar com a equipe se conseguimos fazer [produto do cardápio]! 😊 Enquanto isso, gostaria de adicionar mais alguma coisa no pedido?";
    const out = enforceNoTemplatePlaceholders(input);
    expect(out.toLowerCase()).toContain("me confundi");
    expect(out.toLowerCase()).not.toContain("enquanto isso");
  });

  it("conteúdo substantivo preservado apesar do 'enquanto isso' no meio", () => {
    // Aqui a 1ª frase é útil e NÃO tem placeholder. "Enquanto isso" NÃO é o
    // início — é no meio. Deve preservar.
    const input =
      "Anotei seu pedido de bolo de Morango 2kg pra amanhã às 14h! 😊 Enquanto isso, me confirma o endereço de entrega. O [sabor] foi anotado corretamente.";
    const out = enforceNoTemplatePlaceholders(input);
    // Deve manter "Anotei seu pedido de bolo de Morango 2kg..."
    expect(out.toLowerCase()).toContain("anotei");
    expect(out.toLowerCase()).toContain("morango");
  });
});
