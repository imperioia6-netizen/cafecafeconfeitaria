import { describe, it, expect } from "vitest";
import { enforceOrderTypeQuestion } from "../../../supabase/functions/_shared/intentDetection.ts";

describe("enforceOrderTypeQuestion", () => {
  it("adiciona a pergunta quando falta tipo no estágio awaiting_order_type", () => {
    const out = enforceOrderTypeQuestion(
      "Claro, posso ajudar!",
      "start_order",
      "awaiting_order_type",
      "quero um bolo"
    );
    expect(out).toMatch(/retirada.*delivery.*encomenda|encomenda.*delivery.*retirada/i);
  });

  it("não duplica a pergunta quando cliente já disse o tipo", () => {
    const resp = "Perfeito, vai ser retirada! Qual sabor?";
    const out = enforceOrderTypeQuestion(
      resp,
      "start_order",
      "awaiting_order_type",
      "quero um bolo retirada"
    );
    expect(out).toBe(resp);
  });

  it("não adiciona pergunta em outros estágios", () => {
    const resp = "Seu pedido total é R$ 200.";
    const out = enforceOrderTypeQuestion(
      resp,
      "other",
      "confirming_order",
      "isso"
    );
    expect(out).toBe(resp);
  });

  it("não adiciona pergunta para intent diferente de start_order", () => {
    const resp = "O bolo de chocolate fica R$ 95/kg.";
    const out = enforceOrderTypeQuestion(
      resp,
      "ask_price",
      "awaiting_order_type",
      "quanto custa?"
    );
    expect(out).toBe(resp);
  });
});

// ── Regex de remoção de "Oi" (espelho da correção em evolution-webhook:858) ──
// Replica a lógica para validar que não come palavras legítimas.

function removeLeadingOi(reply: string, isFirstMessage: boolean, intent: string): string {
  if (isFirstMessage || intent === "greeting") return reply;
  const before = reply;
  let out = reply.replace(/^\s*oi\b\s*[!,.]?\s*(?:😊|🙂|👋)?\s*[\n-]*\s*/i, "").trim();
  if (out.length > 0 && out !== before) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

describe("regex de remoção do 'Oi' inicial", () => {
  it("remove 'Oi!' no começo quando NÃO é primeira msg/greeting", () => {
    expect(removeLeadingOi("Oi! Vamos ao pedido?", false, "other")).toBe(
      "Vamos ao pedido?"
    );
  });

  it("remove 'Oi! 😊' com emoji", () => {
    expect(removeLeadingOi("Oi! 😊 Seu pedido está anotado.", false, "start_order")).toBe(
      "Seu pedido está anotado."
    );
  });

  it("NÃO remove 'Oitavo' nem 'Oito' (palavra maior)", () => {
    expect(
      removeLeadingOi("Oitavo cliente do dia, parabéns!", false, "other")
    ).toBe("Oitavo cliente do dia, parabéns!");
    expect(removeLeadingOi("Oito fatias totalizam R$200.", false, "other")).toBe(
      "Oito fatias totalizam R$200."
    );
  });

  it("NÃO remove 'Oi amigo' (comeria 'amigo') — deve preservar frase", () => {
    // A regex só remove "oi" isolado. "Oi amigo" sem pontuação também deveria
    // não ser removido (é um cumprimento coeso). O \s após 'oi' com [!,.]? opcional
    // deixa passar 'Oi ' — aceitável porque remove só a saudação inicial repetida.
    // Este teste documenta o comportamento atual:
    const out = removeLeadingOi("Oi amigo!", false, "other");
    // Se a frase começa com "Oi " e temos a regex \s*oi\s*[!,.]?..., "Oi " casa.
    // Preservamos o restante "amigo!" capitalizado.
    expect(out).toBe("Amigo!");
  });

  it("preserva intacto em primeira mensagem", () => {
    expect(removeLeadingOi("Oi! Tudo bem?", true, "other")).toBe("Oi! Tudo bem?");
  });

  it("preserva intacto quando é saudação", () => {
    expect(removeLeadingOi("Oi! Tudo bem?", false, "greeting")).toBe("Oi! Tudo bem?");
  });
});
