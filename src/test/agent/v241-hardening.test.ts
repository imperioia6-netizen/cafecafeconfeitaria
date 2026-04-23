/**
 * v241 — 4 fixes de robustez identificados em auditoria profunda
 * (logs de produção + análise de prompt e pipeline).
 *
 * 1. enforceGreetingReset: string vazia em confirmed_* agora não
 *    conta como "pedido real" (antes !!"" = false funcionava por
 *    sorte; agora com .trim().length é explícito).
 * 2. enforceAskBeforePayment: window ampliado slice(-2) → slice(-5).
 * 3. enforceSmartFallback: lista de fallback-phrases cobre o
 *    FALLBACK_REPLY literal ("Em instantes nossa equipe retorna").
 * 4. enforceIntentAlignment: greeting + last_assistant_had_pix não
 *    substitui (é continuação mid-pagamento, não cumprimento novo).
 */
import { describe, it, expect } from "vitest";
import {
  enforceGreetingReset,
  enforceAskBeforePayment,
  enforceSmartFallback,
  enforceIntentAlignment,
} from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("Fix 1 — enforceGreetingReset aceita string vazia em session", () => {
  it("confirmed_flavor='' (vazio) NÃO é pedido real → reset", () => {
    const sessionMem = {
      confirmed_flavor: "",
      confirmed_weight: "",
      confirmed_date: "",
      order_type: "",
      order_items: [] as string[],
    };
    const reply =
      "Olá! Vi que seu pedido anterior: bolo chocolate 2kg. Total R$258. Quer confirmar?";
    const out = enforceGreetingReset(reply, "oi", [], sessionMem);
    expect(out.toLowerCase()).not.toContain("r$258");
    expect(out.toLowerCase()).toMatch(/como posso/);
  });

  it("confirmed_flavor com valor REAL ('morango') → preserva retomada", () => {
    const sessionMem = {
      confirmed_flavor: "morango",
      order_items: [] as string[],
    };
    const reply =
      "Oi de novo! Seu pedido: bolo de morango 2kg. Quer confirmar?";
    const out = enforceGreetingReset(reply, "oi", [], sessionMem);
    expect(out).toBe(reply);
  });

  it("order_type='   ' (só espaços) NÃO é pedido real → reset", () => {
    const sessionMem = {
      order_type: "   ",
      order_items: [] as string[],
    };
    const reply =
      "Perfeito! Então vai ser retirada na loja. Seu pedido de 4kg fica pronto amanhã.";
    const out = enforceGreetingReset(reply, "olá", [], sessionMem);
    expect(out.toLowerCase()).not.toContain("4kg");
  });
});

describe("Fix 2 — enforceAskBeforePayment pega 'só isso' de 3-4 msgs atrás", () => {
  it("cliente disse 'só isso' há 4 msgs → PIX passa", () => {
    const h: H[] = [
      { role: "user", content: "quero bolo chocolate 2kg" },
      { role: "assistant", content: "Anotado! Mais alguma coisa?" },
      { role: "user", content: "só isso" }, // ← pedido fechado aqui
      { role: "assistant", content: "Perfeito! Qual forma de pagamento?" },
      { role: "user", content: "pix" },
      { role: "assistant", content: "Vai ser delivery ou retirada?" },
      { role: "user", content: "retirada" },
    ];
    const reply =
      "Beleza! Chave PIX: 11998287836 (Nubank Sandra). Gostaria de mais alguma coisa?";
    const out = enforceAskBeforePayment(reply, "retirada", h);
    // Com slice(-5), o "só isso" é visto → PIX passa (não corta)
    expect(out).toContain("11998287836");
  });

  it("cliente NUNCA disse 'só isso' → PIX é cortado", () => {
    const h: H[] = [
      { role: "user", content: "quero bolo 2kg chocolate" },
      { role: "assistant", content: "Anotado! Mais alguma coisa?" },
      { role: "user", content: "hmm" },
    ];
    const reply =
      "Beleza! Chave PIX: 11998287836. Gostaria de mais alguma coisa?";
    const out = enforceAskBeforePayment(reply, "hmm", h);
    expect(out).not.toContain("11998287836");
  });
});

describe("Fix 3 — enforceSmartFallback pega FALLBACK_REPLY literal", () => {
  it("'Obrigado pela mensagem! Em instantes nossa equipe retorna.' → substitui", () => {
    const out = enforceSmartFallback(
      "Obrigado pela mensagem! Em instantes nossa equipe retorna.",
      {
        intent: "greeting",
        next_action: "greet",
        entities: {},
      }
    );
    expect(out.toLowerCase()).not.toContain("em instantes");
    expect(out.toLowerCase()).toMatch(/oi|ajudar/);
  });

  it("'equipe retorna' sozinho também é fallback", () => {
    const out = enforceSmartFallback("Aguarde — equipe retorna em breve.", {
      intent: "greeting",
      next_action: "greet",
      entities: {},
    });
    expect(out.toLowerCase()).not.toContain("equipe retorna");
  });

  it("'estamos à disposição' com acento é fallback", () => {
    const out = enforceSmartFallback(
      "Obrigado pela mensagem! Estamos à disposição.",
      {
        intent: "ask_menu",
        next_action: "answer_menu_or_price",
        entities: {},
      }
    );
    expect(out.toLowerCase()).toMatch(/cardapio|cardápio|preço|produto/);
  });
});

describe("Fix 4 — enforceIntentAlignment preserva greeting mid-pagamento", () => {
  it("cliente diz 'oi' + last_assistant mandou PIX → preserva resposta LLM", () => {
    // Cenário: atendente mandou PIX, cliente manda "oi de novo" (confirmação
    // disfarçada). LLM responde continuando o fluxo. NÃO sobrescreve.
    const reply =
      "Ok! Fico no aguardo do seu comprovante do PIX de R$193,50.";
    const out = enforceIntentAlignment(reply, {
      intent: "greeting",
      next_action: "greet",
      entities: {},
      client_short_affirmation: false,
      last_assistant_had_pix: true,
    });
    expect(out).toBe(reply);
  });

  it("cliente diz 'oi' + last_assistant SEM PIX → substitui (caso original)", () => {
    const reply =
      "Oi! Seu pedido: Bolo 2kg R$258. Total R$258. Chave PIX: 11998287836";
    const out = enforceIntentAlignment(reply, {
      intent: "greeting",
      next_action: "greet",
      entities: {},
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out.toLowerCase()).toMatch(/como posso/);
    expect(out).not.toContain("R$258");
  });
});
