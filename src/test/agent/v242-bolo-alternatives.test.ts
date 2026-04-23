/**
 * v242 — corrige 2 bugs reais observados na screenshot v241:
 *
 * Erro 1: guardrail sugeria SALGADOS ("Coxinha com Catupiry, Kibe, Pão de
 *         Batata, Empada Palmito") como se fossem sabores de BOLO.
 *         Raiz: recipeNames.slice(0, 4) pegava os primeiros da tabela
 *         `recipes`, que mistura bolo+salgado+doce.
 *         Fix: filterBoloNames() restringe à lista canônica BOLOS.
 *
 * Erro 2: LLM respondeu corretamente ("cenoura não temos, quer morango?")
 *         mas enforceNoFragmentAsFlavor substituía por "Opa, entendi
 *         errado" porque o LLM não disse "vou verificar com a equipe".
 *         Fix: aceitar como handling correto quando LLM oferece
 *         alternativa que ESTÁ no cardápio (mentionsMenuAlternative).
 *
 * Erro 3 (sutil): regex de limpeza inline em enforceNoTemplatePlaceholders
 *         não pegava "disponíveis INCLUEM:" (só pegava "disponíveis:").
 *         Fix: regex ampliado.
 */
import { describe, it, expect } from "vitest";
import {
  enforceReplyGuardrails,
  enforceNoFragmentAsFlavor,
  enforceNoTemplatePlaceholders,
} from "../../../supabase/functions/_shared/priceEngine.ts";

describe("Erro 1 — enforceReplyGuardrails não oferece SALGADOS como sabor de bolo", () => {
  // recipeNames com ordem BANCO-REAL: salgados primeiro, bolos depois
  const recipeNamesMixed = [
    "Coxinha com Catupiry", // salgado
    "Kibe", // salgado
    "Pão de Batata", // salgado
    "Empada Palmito", // salgado
    "Brigadeiro", // bolo
    "Trufado", // bolo
    "Morango", // bolo
    "Ninho com Nutella", // bolo
  ];

  it("quando LLM alucina sabor e cliente pediu recomendação, sugere só BOLOS", () => {
    const reply = `Nossos bolos mais pedidos são bolo de tiramisu... etc`;
    const out = enforceReplyGuardrails(
      reply,
      recipeNamesMixed,
      "qual bolo você recomenda?"
    );
    expect(out.toLowerCase()).not.toContain("coxinha");
    expect(out.toLowerCase()).not.toContain("kibe");
    expect(out.toLowerCase()).not.toContain("empada");
    // Tem bolos reais
    const hasBolo =
      out.toLowerCase().includes("brigadeiro") ||
      out.toLowerCase().includes("trufado") ||
      out.toLowerCase().includes("morango");
    expect(hasBolo).toBe(true);
  });

  it("quando LLM alucina sabor sem cliente pedir recomendação, sugestão final é de BOLOS", () => {
    const reply =
      "Temos bolo de framboesa de graça nesse momento! Quer provar?";
    const out = enforceReplyGuardrails(
      reply,
      recipeNamesMixed,
      "quero um bolo"
    );
    expect(out.toLowerCase()).not.toContain("coxinha");
    expect(out.toLowerCase()).not.toContain("kibe");
    // Não deve sugerir "Pão de Batata" como sabor de bolo
    expect(out.toLowerCase()).not.toContain("pão de batata");
    expect(out).toContain("Nossos sabores disponíveis");
  });

  it("fallback: se o banco não tem bolo que bate com canônico, usa catalog.ts BOLOS", () => {
    // Caso extremo: tabela recipes só tem salgados por algum motivo
    const onlySalgados = [
      "Coxinha",
      "Kibe",
      "Pão de Batata",
      "Empada Palmito",
    ];
    const reply = "Temos bolo de framboesa sim!";
    const out = enforceReplyGuardrails(
      reply,
      onlySalgados,
      "quero bolo de framboesa"
    );
    // Não pode oferecer salgados como sabor de bolo, nem com fallback
    expect(out.toLowerCase()).not.toContain("coxinha");
    expect(out.toLowerCase()).not.toContain("pão de batata");
    // Deve conter pelo menos um sabor real (do catalog.ts BOLOS)
    const saborReal =
      out.toLowerCase().includes("brigadeiro") ||
      out.toLowerCase().includes("trufado") ||
      out.toLowerCase().includes("morango") ||
      out.toLowerCase().includes("ninho");
    expect(saborReal).toBe(true);
  });
});

describe("Erro 2 — enforceNoFragmentAsFlavor aceita alternativa do cardápio", () => {
  const recipeNames = [
    "Brigadeiro",
    "Trufado",
    "Morango",
    "Ninho com Morango",
    "Chocolate",
  ];

  it("LLM rejeita cenoura E oferece morango → preserva resposta", () => {
    // Caso REAL (screenshot): cliente pediu "meio cenoura meio morango",
    // LLM respondeu "cenoura não temos, quer 1kg de morango inteiro?".
    // Era resposta perfeita. Não pode ser substituída.
    const resp =
      "Também não temos cenoura no cardápio. Quer o de 1kg de morango inteiro então?";
    const out = enforceNoFragmentAsFlavor(
      resp,
      "quero meio cenoura meio morango",
      recipeNames
    );
    expect(out).toBe(resp);
  });

  it("LLM rejeita sabor MAS oferece alternativa real → preserva", () => {
    const resp =
      "Opa, nutella puro a gente não tem, mas temos Ninho com Morango e Trufado. Qual prefere?";
    const out = enforceNoFragmentAsFlavor(
      resp,
      "quero bolo de nutella",
      recipeNames
    );
    expect(out).toBe(resp);
  });

  it("LLM rejeita sabor sem alternativa e sem 'vou verificar' → substitui", () => {
    const resp = "O sabor cenoura a gente não tem.";
    const out = enforceNoFragmentAsFlavor(
      resp,
      "quero bolo de cenoura",
      recipeNames
    );
    // Nada oferecido de volta, resposta substituída
    expect(out).not.toBe(resp);
    expect(out.toLowerCase()).toMatch(/confirma.*sabor|qual.*sabor/);
  });

  it("LLM diz 'não temos X, vou verificar com a equipe' → preserva (já funcionava)", () => {
    const resp =
      "O sabor pistache a gente não tem, vou verificar com a equipe se conseguimos fazer.";
    const out = enforceNoFragmentAsFlavor(
      resp,
      "quero pistache",
      recipeNames
    );
    expect(out).toBe(resp);
  });

  it("LLM com 'a gente' pronome + alternativa → preserva (caso composto)", () => {
    const resp =
      "Esse sabor a gente não tem no cardápio, mas temos brigadeiro e morango — qual prefere?";
    // "a gente" é pronome (não sabor), mas o guardrail do pattern 3 capturava
    // "a gente" como X. Agora com llmOffersMenuAlternative=true (brigadeiro
    // está no recipeNames), passa mesmo com pronome.
    const out = enforceNoFragmentAsFlavor(
      resp,
      "quero bolo de framboesa",
      recipeNames
    );
    // Com alternativa do menu oferecida, preserva
    expect(out).toBe(resp);
  });
});

describe("Erro 3 — regex ampliado pega 'disponíveis incluem:'", () => {
  it("'Nossos sabores disponíveis incluem: X, Y, Z' é removido na limpeza inline", () => {
    const input =
      "Anotei seu bolo de 2kg pra amanhã às 14h. Confirmo data e horário. O [produto do cardápio] não tenho — qual sabor quer?\n\nNossos sabores disponíveis incluem: Coxinha com Catupiry, Kibe, Pão de Batata, Empada Palmito. Quer ver o cardápio completo?";
    const out = enforceNoTemplatePlaceholders(input);
    expect(out.toLowerCase()).not.toContain("coxinha");
    expect(out.toLowerCase()).not.toContain("kibe");
    expect(out.toLowerCase()).not.toContain("disponíveis");
    // Deve preservar parte útil
    expect(out.toLowerCase()).toContain("2kg pra amanhã");
  });

  it("'Sabores disponíveis são: X, Y' também é removido", () => {
    const input =
      "O sabor que você pediu a gente não tem no cardápio, me confirma qual você quer? Sabores disponíveis são: Brigadeiro, Morango, Chocolate.";
    // Passa por enforceNoTemplatePlaceholders (sem placeholder aqui, retorna
    // sem mexer) — mas testamos o regex aplicado SE disparasse.
    // Simulação direta: input tem placeholder para forçar o path
    const inputWithPh =
      "O [sabor] não temos — qual quer? Sabores disponíveis são: Brigadeiro, Morango, Chocolate. Fala aí qual prefere.";
    const out = enforceNoTemplatePlaceholders(inputWithPh);
    expect(out.toLowerCase()).not.toContain("sabores disponíveis");
  });
});

describe("Cenário composto (screenshot real)", () => {
  it("LLM responde bem + placeholder + lista errada → sobra só a parte útil sem salgados", () => {
    const recipeNamesMixed = [
      "Coxinha com Catupiry",
      "Kibe",
      "Brigadeiro",
      "Trufado",
      "Morango",
      "Ninho com Nutella",
    ];
    const original =
      "Anotado o [produto do cardápio]! Sobre o sabor nutella, a gente não tem puro, mas temos Ninho com Nutella (R$137/kg) e Nutella com Brigadeiro Branco (R$137/kg). Qual prefere?\n\nE o de 1kg não conseguimos fazer meio a meio, só a partir de 2kg. Também não temos cenoura no cardápio. Quer o de 1kg de morango inteiro então?\n\nNossos sabores disponíveis incluem: Coxinha com Catupiry, Kibe, Pão de Batata, Empada Palmito. Quer ver o cardápio completo?";

    // Passo 1: enforceNoTemplatePlaceholders remove [produto do cardápio] e
    // a lista errada de salgados
    const afterPlaceholder = enforceNoTemplatePlaceholders(original);
    expect(afterPlaceholder).not.toContain("[produto");
    expect(afterPlaceholder.toLowerCase()).not.toContain("coxinha");
    expect(afterPlaceholder.toLowerCase()).not.toContain("kibe");
    // Parte útil preservada
    expect(afterPlaceholder.toLowerCase()).toContain("ninho com nutella");
    expect(afterPlaceholder.toLowerCase()).toContain("morango");

    // Passo 2: enforceNoFragmentAsFlavor vê "cenoura não temos" + alternativa
    // (morango no cardápio) → preserva
    const final = enforceNoFragmentAsFlavor(
      afterPlaceholder,
      "quero o de 4kg de nutella e o de 1kg meio cenoura e meio morango",
      recipeNamesMixed
    );
    expect(final).toBe(afterPlaceholder);
    expect(final.toLowerCase()).toMatch(/morango|nutella/);
  });
});
