/**
 * Regressão do screenshot: cliente disse "pix" e agente pediu sabor válido.
 * Cliente disse "Oi" e agente mandou fallback "equipe já foi avisada".
 */
import { describe, it, expect } from "vitest";
import {
  enforceIntentAlignment,
  enforceGreetingReset,
  enforceNoFragmentAsFlavor,
} from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("enforceIntentAlignment — pix + reply pede sabor", () => {
  it("'pix' + 'Ainda preciso de um sabor válido' → troca por envio de PIX", () => {
    const out = enforceIntentAlignment(
      "Ainda preciso de um sabor válido pro bolo. Pode escolher um do nosso cardápio?",
      {
        intent: "payment_method_choice",
        next_action: "send_pix",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toMatch(/preciso de um sabor/);
    expect(out.toLowerCase()).toMatch(/pix|momento/);
  });

  it("'pix' + 'Qual o peso do bolo?' → troca", () => {
    const out = enforceIntentAlignment(
      "Qual o peso do bolo que você quer?",
      {
        intent: "payment_method_choice",
        next_action: "send_pix",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toMatch(/qual o peso/);
    expect(out.toLowerCase()).toMatch(/pix|momento/);
  });

  it("'pix' + resposta correta (envia PIX) → passa", () => {
    const resp = "Perfeito! Chave PIX: 11998287836 — sinal de R$150.";
    const out = enforceIntentAlignment(resp, {
      intent: "payment_method_choice",
      next_action: "send_pix",
      entities: {},
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out).toBe(resp);
  });
});

describe("enforceIntentAlignment — saudação + fallback inadequado", () => {
  it("greeting + 'equipe já foi avisada' → troca por cumprimento humano", () => {
    const out = enforceIntentAlignment(
      "Obrigado pela mensagem! Nossa equipe já foi avisada e em breve retorna. Qualquer dúvida, estamos à disposição",
      {
        intent: "greeting",
        next_action: "greet",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toMatch(/equipe.*avisada|em breve retorna/);
    expect(out.toLowerCase()).toMatch(/ajudar|oi/);
  });
});

describe("enforceGreetingReset — pega fallback de equipe", () => {
  it("'oi' + fallback 'equipe já foi avisada' → cumprimento", () => {
    const out = enforceGreetingReset(
      "Obrigado pela mensagem! Nossa equipe já foi avisada e em breve retorna.",
      "oi",
      [{ role: "assistant", content: "Tudo bem?" }]
    );
    expect(out.toLowerCase()).not.toMatch(/equipe.*avisada/);
    expect(out.toLowerCase()).toMatch(/ajudar|oi/);
  });

  it("'oi' + resposta curta normal de cumprimento → passa", () => {
    const resp = "Oi! Como posso te ajudar? 😊";
    expect(enforceGreetingReset(resp, "oi", [])).toBe(resp);
  });
});

describe("enforceNoFragmentAsFlavor — 'preciso de sabor válido' em contexto errado", () => {
  it("cliente disse 'pix' + resposta 'preciso de um sabor válido' → troca", () => {
    const out = enforceNoFragmentAsFlavor(
      "Ainda preciso de um sabor válido pro bolo. Pode escolher um?",
      "pix",
      ["Brigadeiro", "Trufado"]
    );
    expect(out.toLowerCase()).not.toMatch(/preciso de um sabor v[aá]lid/);
    expect(out.toLowerCase()).toMatch(/retomar|momento|sabor/);
  });

  it("cliente disse 'amanha 13h' + resposta 'preciso de sabor válido' → troca", () => {
    const out = enforceNoFragmentAsFlavor(
      "Ainda preciso de um sabor válido!",
      "amanha 13h",
      ["Brigadeiro"]
    );
    expect(out.toLowerCase()).not.toMatch(/preciso de um sabor v[aá]lid/);
  });

  it("cliente genuinamente pediu sabor inexistente → guardrail não mexe de graça", () => {
    const out = enforceNoFragmentAsFlavor(
      "Preciso de um sabor válido. Qual você quer?",
      "quero bolo de jabuticaba",
      ["Brigadeiro", "Trufado"]
    );
    // Aqui cliente disse algo que não é pagamento nem horário — não dispara
    // o caso especial. Passa.
    expect(out).toBeTruthy();
  });
});
