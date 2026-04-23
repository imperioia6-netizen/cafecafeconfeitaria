/**
 * Regressão real (screenshot v240): Cliente responde à pergunta
 * "É para encomenda, delivery ou retirada?" com "Encomenda" — e o agente
 * alucina "Esse sabor a gente não tem no cardápio, vou verificar com a
 * equipe". Isso é ERRO GRAVE: "Encomenda" é MODALIDADE, não sabor.
 *
 * Raiz do bug:
 *  (1) enforceNoFragmentAsFlavor tinha bailout em "vou verificar com a equipe"
 *      que deixava passar QUALQUER resposta com essa frase — mesmo as que
 *      capturavam "a gente" como pronome e tratavam como sabor.
 *  (2) enforceIntentAlignment não tinha caso para provide_order_type.
 *
 * Fix:
 *  (1) Bailout só aplica quando X é nome-plausível de sabor (não funcional).
 *  (2) enforceIntentAlignment agora detecta provide_order_type +
 *      resposta-que-pensa-que-é-sabor e substitui.
 */
import { describe, it, expect } from "vitest";
import {
  enforceNoFragmentAsFlavor,
  enforceIntentAlignment,
} from "../../../supabase/functions/_shared/priceEngine.ts";

describe("enforceNoFragmentAsFlavor — bailout 'vou verificar' NÃO protege alucinação", () => {
  it("caso real: 'Esse sabor a gente não tem... vou verificar com a equipe' → substitui", () => {
    // LLM alucinou tratando "Encomenda" (modalidade) como se fosse sabor.
    // "a gente" é pronome sujeito de 'não tem' — NÃO é o sabor.
    const resp =
      "Esse sabor a gente não tem no cardápio, vou verificar com a equipe se é possível fazer! Enquanto isso, me diz qual a data.";
    const out = enforceNoFragmentAsFlavor(resp, "Encomenda");
    expect(out).not.toMatch(/a\s+gente/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma.*sabor/);
  });

  it("'sabor ser as não temos, vou verificar com a equipe' → substitui", () => {
    // Mesmo com 'vou verificar' no final, fragmento funcional é bug.
    const resp =
      "O sabor 'ser as' não temos, vou verificar com a equipe se é possível fazer.";
    const out = enforceNoFragmentAsFlavor(resp, "pode ser as 9");
    expect(out).not.toMatch(/ser as/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma.*sabor/);
  });

  it("rejeição REAL com 'vou verificar com a equipe' ainda passa (red velvet)", () => {
    // Cliente pediu red velvet (plausível, não está no cardápio) — LLM
    // respondeu corretamente "não temos, vou verificar". Deve preservar.
    const resp =
      "O sabor 'red velvet' não temos por enquanto, vou verificar com a equipe.";
    const out = enforceNoFragmentAsFlavor(
      resp,
      "quero um bolo de red velvet",
      ["Brigadeiro", "Morango", "Chocolate"]
    );
    expect(out).toBe(resp);
  });

  it("rejeição REAL de 'pistache' com 'vou verificar' passa intacta", () => {
    const resp =
      "O sabor 'pistache' não temos no cardápio, vou verificar com a equipe se conseguimos fazer.";
    const out = enforceNoFragmentAsFlavor(resp, "quero bolo de pistache", [
      "Brigadeiro",
      "Morango",
    ]);
    expect(out).toBe(resp);
  });
});

describe("enforceIntentAlignment — provide_order_type não pode virar sabor", () => {
  it("cliente disse 'Encomenda' + resposta menciona 'sabor não temos' → substitui por pergunta de modalidade", () => {
    const out = enforceIntentAlignment(
      "Esse sabor a gente não tem no cardápio, vou verificar com a equipe.",
      {
        intent: "provide_order_type",
        next_action: "ask_entrega_ou_retirada",
        entities: { order_type: "encomenda" },
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out).not.toMatch(/sabor/i);
    expect(out.toLowerCase()).toMatch(/entrega|retirada|data/);
  });

  it("cliente disse 'delivery' + resposta diz 'bolo de delivery' → substitui", () => {
    const out = enforceIntentAlignment(
      "Anotei um bolo de delivery. Qual o peso?",
      {
        intent: "provide_order_type",
        next_action: "continue_conversation",
        entities: { order_type: "delivery" },
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toContain("bolo de delivery");
    expect(out.toLowerCase()).toMatch(/vai querer|me diz/);
  });

  it("cliente disse 'Retirada' + resposta ok (sem hallucination) → passa intacta", () => {
    const resp = "Beleza! Me diz o que vai querer, por favor 😊";
    const out = enforceIntentAlignment(resp, {
      intent: "provide_order_type",
      next_action: "continue_conversation",
      entities: { order_type: "retirada" },
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out).toBe(resp);
  });

  it("provide_order_type com order_type=encomenda → pergunta entrega/retirada", () => {
    const out = enforceIntentAlignment(
      "Esse sabor não existe no cardápio.",
      {
        intent: "provide_order_type",
        next_action: "ask_entrega_ou_retirada",
        entities: { order_type: "encomenda" },
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).toMatch(/entrega|retirada/);
  });
});
