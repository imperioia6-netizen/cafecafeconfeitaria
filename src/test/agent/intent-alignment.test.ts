/**
 * Testa o guardrail enforceIntentAlignment — rede final de segurança que usa
 * a classificação determinística pra bater se a resposta do LLM faz sentido.
 */
import { describe, it, expect } from "vitest";
import { enforceIntentAlignment } from "../../../supabase/functions/_shared/priceEngine.ts";

describe("enforceIntentAlignment", () => {
  it("PDF comprovante + resposta com PIX → troca por confirmação", () => {
    const out = enforceIntentAlignment(
      `Anotado! Chave PIX: 11998287836. Total R$250.`,
      {
        intent: "send_proof",
        next_action: "confirm_proof_received",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: true,
      }
    );
    expect(out).not.toMatch(/chave\s*pix/i);
    expect(out).not.toMatch(/R\$\s*250/);
    expect(out.toLowerCase()).toMatch(/comprovante|verific/);
  });

  it("saudação + resposta com preços → cumprimento simples", () => {
    const out = enforceIntentAlignment(
      `Oi Vitor! Seu pedido: Bolo 2kg R$258. Total R$258. Chave PIX: 1199`,
      {
        intent: "greeting",
        next_action: "greet",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out).not.toMatch(/R\$\s*258/);
    expect(out.toLowerCase()).toMatch(/ajudar/);
  });

  it("confirm_more (só isso) + PIX na resposta → pergunta forma de pagamento", () => {
    const out = enforceIntentAlignment(
      `Perfeito! Chave PIX: 11998287836. Sinal 50%: R$129.`,
      {
        intent: "confirm_more",
        next_action: "ask_payment_method",
        entities: {},
        client_short_affirmation: true,
        last_assistant_had_pix: false,
      }
    );
    expect(out).not.toMatch(/chave\s*pix/i);
    expect(out.toLowerCase()).toMatch(/pagar|pix|dinheiro|cart/);
  });

  it("payment_done + resumo repetido → resposta curta aguardando comprovante", () => {
    const out = enforceIntentAlignment(
      `Resumo do pedido: Bolo R$200. Total R$200. Chave PIX: 1199`,
      {
        intent: "payment_done",
        next_action: "wait_for_proof",
        entities: {},
        client_short_affirmation: true,
        last_assistant_had_pix: true,
      }
    );
    expect(out.toLowerCase()).toMatch(/aguardo|comprovante/);
    expect(out).not.toMatch(/R\$\s*200/);
  });

  it("new_order + resumo antigo → reset pra novo pedido", () => {
    const out = enforceIntentAlignment(
      `Seu pedido atual: Bolo R$200. Total R$200.`,
      {
        intent: "new_order",
        next_action: "reset_for_new_order",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).toMatch(/novo pedido|zero/);
  });

  it("cancel + resumo → mensagem de cancelamento", () => {
    const out = enforceIntentAlignment(
      `Seu pedido: bolo R$200. Total R$200.`,
      {
        intent: "cancel",
        next_action: "handle_cancel",
        entities: {},
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).toMatch(/cancel/);
    expect(out).not.toMatch(/R\$/);
  });

  it("resposta já alinhada → passa intacta", () => {
    const resp = "Oi! Como posso te ajudar? 😊";
    const out = enforceIntentAlignment(resp, {
      intent: "greeting",
      next_action: "greet",
      entities: {},
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out).toBe(resp);
  });

  it("intent desconhecido → passa intacta", () => {
    const resp = "Qualquer texto.";
    const out = enforceIntentAlignment(resp, {
      intent: "unclear",
      next_action: "continue_conversation",
      entities: {},
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out).toBe(resp);
  });
});
