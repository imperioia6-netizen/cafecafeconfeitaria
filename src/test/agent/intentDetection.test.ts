import { describe, it, expect } from "vitest";
import {
  detectIntent,
  wantsNewOrder,
  deriveStage,
} from "../../../supabase/functions/_shared/intentDetection.ts";

describe("detectIntent", () => {
  it("saudações puras → greeting", () => {
    expect(detectIntent("Oi")).toBe("greeting");
    expect(detectIntent("Oi!")).toBe("greeting");
    expect(detectIntent("Olá")).toBe("greeting");
    expect(detectIntent("bom dia")).toBe("greeting");
    expect(detectIntent("boa tarde!")).toBe("greeting");
    expect(detectIntent("Oi, tudo bem?")).toBe("greeting");
  });

  it("pergunta de preço", () => {
    expect(detectIntent("quanto custa o bolo de chocolate?")).toBe("ask_price");
    expect(detectIntent("qual o valor?")).toBe("ask_price");
    expect(detectIntent("quanto fica 2kg de brigadeiro")).toBe("ask_price");
    expect(detectIntent("me manda a tabela de preços")).toBe("ask_price");
  });

  it("quero pedir → start_order", () => {
    expect(detectIntent("Quero pedir um bolo")).toBe("start_order");
    expect(detectIntent("gostaria de pedir 100 mini salgados")).toBe("start_order");
    expect(detectIntent("vou querer bolo de ninho")).toBe("start_order");
    expect(detectIntent("me vê 25 coxinhas")).toBe("start_order");
  });

  it("resposta curta de sabor → start_order (resp. ao 'qual sabor?')", () => {
    expect(detectIntent("de chocolate")).toBe("start_order");
    expect(detectIntent("o de ninho")).toBe("start_order");
  });

  it("recomendações → ask_recommendation", () => {
    expect(detectIntent("qual você recomenda?")).toBe("ask_recommendation");
    expect(detectIntent("quais sabores vocês têm?")).toBe("ask_recommendation");
    expect(detectIntent("me manda o cardápio")).toBe("ask_recommendation");
  });

  it("comprovante explícito → payment_proof", () => {
    expect(detectIntent("paguei")).toBe("payment_proof");
    expect(detectIntent("já fiz o pix")).toBe("payment_proof");
    expect(detectIntent("transferi agora")).toBe("payment_proof");
    expect(detectIntent("segue o comprovante")).toBe("payment_proof");
  });

  it("'pix' + 'pronto/feito' só vira payment_proof em msgs curtas sem dúvida", () => {
    expect(detectIntent("pix pronto")).toBe("payment_proof");
    expect(detectIntent("pix feito")).toBe("payment_proof");
    // Perguntas não devem virar comprovante:
    expect(detectIntent("quando o pix estiver pronto eu aviso?")).not.toBe(
      "payment_proof"
    );
    expect(detectIntent("como faço pro pix ficar pronto?")).not.toBe(
      "payment_proof"
    );
  });

  it("urgência de entrega → delivery_urgency", () => {
    expect(detectIntent("precisa entregar agora")).toBe("delivery_urgency");
    expect(detectIntent("é pra hoje o pedido")).toBe("delivery_urgency");
    expect(detectIntent("delivery urgente")).toBe("delivery_urgency");
  });

  it("mensagens neutras caem em 'other'", () => {
    expect(detectIntent("ok")).toBe("other");
    expect(detectIntent("entendi")).toBe("other");
  });
});

describe("wantsNewOrder", () => {
  it("detecta pedido de reset", () => {
    expect(wantsNewOrder("quero fazer um novo pedido")).toBe(true);
    expect(wantsNewOrder("começar do zero")).toBe(true);
    expect(wantsNewOrder("recomeçar")).toBe(true);
    expect(wantsNewOrder("outro pedido por favor")).toBe(true);
  });

  it("não dispara em frases normais", () => {
    expect(wantsNewOrder("quero um bolo novo sabor")).toBe(false);
    expect(wantsNewOrder("oi, tudo bem?")).toBe(false);
    expect(wantsNewOrder("quero 2kg")).toBe(false);
  });
});

describe("deriveStage", () => {
  it("cancelamento reseta para start", () => {
    const s = deriveStage({ stage: "collecting_items" }, "other", "cancela tudo");
    expect(s).toBe("start");
  });

  it("start_order sem tipo → awaiting_order_type", () => {
    const s = deriveStage({ stage: "start" }, "start_order", "quero um bolo");
    expect(s).toBe("awaiting_order_type");
  });

  it("start_order COM tipo → collecting_items", () => {
    const s = deriveStage(
      { stage: "start" },
      "start_order",
      "quero um bolo para delivery"
    );
    expect(s).toBe("collecting_items");
  });

  it("awaiting_order_type → tipo informado → collecting_items", () => {
    const s = deriveStage(
      { stage: "awaiting_order_type" },
      "other",
      "retirada"
    );
    expect(s).toBe("collecting_items");
  });

  it("confirmação sem negação → confirming_order", () => {
    const s = deriveStage(
      { stage: "collecting_items" },
      "other",
      "isso mesmo, pode confirmar"
    );
    expect(s).toBe("confirming_order");
  });

  it("negação não é confirmação", () => {
    const s = deriveStage(
      { stage: "collecting_items" },
      "other",
      "isso não é o que pedi"
    );
    expect(s).not.toBe("confirming_order");
  });

  it("payment_proof → post_payment", () => {
    const s = deriveStage(
      { stage: "awaiting_payment" },
      "payment_proof",
      "paguei"
    );
    expect(s).toBe("post_payment");
  });
});
