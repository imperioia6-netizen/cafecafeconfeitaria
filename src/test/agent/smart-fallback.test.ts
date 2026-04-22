/**
 * Quando o LLM falha (timeout/erro/vazio), o webhook retorna FALLBACK_ATENDENTE
 * "Obrigado pela mensagem! Nossa equipe já foi avisada...". Isso é inadequado
 * em quase todo contexto. O guardrail enforceSmartFallback substitui por
 * resposta determinística baseada na intent.
 */
import { describe, it, expect } from "vitest";
import { enforceSmartFallback } from "../../../supabase/functions/_shared/priceEngine.ts";

const FALLBACK =
  "Obrigado pela mensagem! Nossa equipe já foi avisada e em breve retorna. Qualquer dúvida, estamos à disposição.";

describe("enforceSmartFallback — substitui fallback inadequado", () => {
  it("greeting → 'Oi! Como posso te ajudar?'", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "greeting",
      next_action: "greet",
      entities: {},
    });
    expect(out.toLowerCase()).toMatch(/oi|ajudar/);
    expect(out).not.toMatch(/equipe/i);
  });

  it("start_order com flavor+weight → confirmação com itens", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "start_order",
      next_action: "ask_more_items",
      entities: { flavor: "Morango", weight_kg: 3, writing_phrase: "amo voce" },
    });
    expect(out.toLowerCase()).toMatch(/mais alguma|finalizar/);
    expect(out).not.toMatch(/equipe/i);
  });

  it("payment_method_choice → envia PIX", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "payment_method_choice",
      next_action: "send_pix",
      entities: {},
    });
    expect(out.toLowerCase()).toMatch(/pix/);
    expect(out).toMatch(/11998287836/);
    expect(out).not.toMatch(/equipe já foi avisada/i);
  });

  it("send_proof → confirma recebimento", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "send_proof",
      next_action: "confirm_proof_received",
      entities: {},
    });
    expect(out.toLowerCase()).toMatch(/comprovante|verific/);
  });

  it("payment_done → aguarda comprovante", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "payment_done",
      next_action: "wait_for_proof",
      entities: {},
    });
    expect(out.toLowerCase()).toMatch(/aguardo|comprovante/);
  });

  it("ask_menu → oferece cardápio", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "ask_menu",
      next_action: "answer_menu_or_price",
      entities: {},
    });
    expect(out).toMatch(/bit\.ly|card[aá]pio/i);
  });

  it("new_order → começa do zero", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "new_order",
      next_action: "reset_for_new_order",
      entities: {},
    });
    expect(out.toLowerCase()).toMatch(/novo|come[cç]ar/);
  });

  it("cancel → cancela", () => {
    const out = enforceSmartFallback(FALLBACK, {
      intent: "cancel",
      next_action: "handle_cancel",
      entities: {},
    });
    expect(out.toLowerCase()).toMatch(/cancel/);
  });

  it("caso real — 'Quero um bolo de 3kg de morango com escrita amo você'", () => {
    // Intent: start_order com flavor=Morango, weight=3, writing_phrase="amo você"
    // next_action: ask_more_items (já tem tudo)
    const out = enforceSmartFallback(FALLBACK, {
      intent: "start_order",
      next_action: "ask_more_items",
      entities: {
        flavor: "Morango",
        weight_kg: 3,
        writing_phrase: "amo você",
      },
    });
    expect(out.toLowerCase()).toMatch(/morango|3kg|mais alguma/);
    expect(out).not.toMatch(/equipe/i);
  });

  it("resposta normal (não fallback) passa intacta", () => {
    const resp = "Anotado! Qual o próximo item?";
    expect(
      enforceSmartFallback(resp, {
        intent: "start_order",
        next_action: "ask_more_items",
        entities: {},
      })
    ).toBe(resp);
  });

  it("fallback variante 'não consegui processar' → substitui", () => {
    const out = enforceSmartFallback(
      "No momento não consegui processar. Pode repetir em poucos segundos.",
      {
        intent: "greeting",
        next_action: "greet",
        entities: {},
      }
    );
    expect(out).not.toMatch(/não consegui processar/);
  });
});
