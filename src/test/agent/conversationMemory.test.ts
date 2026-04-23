import { describe, it, expect } from "vitest";
import {
  extractOrderMemory,
  buildRecentHistoryHint,
  enforceCakeContinuity,
  buildOrderMemoryHint,
  buildPreviousQuestionHint,
} from "../../../supabase/functions/_shared/conversationMemory.ts";

type H = { role: "user" | "assistant"; content: string };

describe("extractOrderMemory", () => {
  it("detecta bolo com peso", () => {
    const h: H[] = [{ role: "user", content: "quero um bolo de 2kg de chocolate" }];
    const r = extractOrderMemory(h);
    expect(r.hasCake).toBe(true);
    expect(r.items.length).toBeGreaterThan(0);
  });

  it("detecta mini salgados pela quantidade", () => {
    const h: H[] = [{ role: "user", content: "quero 50 mini coxinha" }];
    const r = extractOrderMemory(h);
    expect(r.hasSalgados).toBe(true);
  });

  it("ignora respostas do bot — só extrai do que o cliente disse (v223)", () => {
    // v223: extractOrderMemory passou a filtrar role==='user'. Mensagens do
    // assistant ("Seu total: R$235,00") não viram itens — antes o LLM
    // alucinava itens lendo as próprias respostas como pedido do cliente.
    const h: H[] = [
      { role: "assistant", content: "Seu total: R$ 235,00. Confirma?" },
      { role: "user", content: "isso" },
    ];
    const r = extractOrderMemory(h);
    expect(r.items.join(" ").toLowerCase()).not.toMatch(/r\$\s*235/);
  });

  it("extrai 'Total: R$X' QUANDO veio do próprio cliente", () => {
    const h: H[] = [
      { role: "user", content: "fechei: total R$ 235,00 mesmo" },
    ];
    const r = extractOrderMemory(h);
    expect(r.items.join(" ").toLowerCase()).toMatch(/r\$\s*235/);
  });

  it("histórico vazio não explode", () => {
    expect(extractOrderMemory([]).items).toEqual([]);
  });
});

describe("buildRecentHistoryHint", () => {
  it("formata últimas 6 msgs como 'cliente:' / 'atendente:'", () => {
    const h: H[] = [
      { role: "user", content: "oi" },
      { role: "assistant", content: "Oi! Como posso ajudar?" },
      { role: "user", content: "quero um bolo" },
    ];
    const hint = buildRecentHistoryHint(h);
    expect(hint).toContain("cliente: oi");
    expect(hint).toContain("atendente: Oi!");
  });

  it("retorna vazio quando sem histórico", () => {
    expect(buildRecentHistoryHint([])).toBe("");
  });
});

describe("buildOrderMemoryHint", () => {
  it("marca PESO já informado", () => {
    const h: H[] = [
      { role: "user", content: "quero bolo de chocolate 2kg" },
      { role: "assistant", content: "Perfeito, 2kg?" },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/PESO:\s*2kg/);
  });

  it("marca SABOR e TIPO já informados", () => {
    const h: H[] = [
      {
        role: "user",
        content: "quero um bolo de morango para delivery",
      },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint.toLowerCase()).toContain("sabor");
    expect(hint.toLowerCase()).toContain("tipo");
  });

  it("sem nenhum dado → string vazia", () => {
    expect(buildOrderMemoryHint([])).toBe("");
  });
});

describe("enforceCakeContinuity", () => {
  it("cliente pergunta 'e o bolo?' e resposta esqueceu → injeta resumo", () => {
    const h: H[] = [
      { role: "user", content: "quero bolo de chocolate 2kg" },
      { role: "assistant", content: "OK, anotado." },
    ];
    const out = enforceCakeContinuity(
      "Gostaria de mais alguma coisa?",
      "e o bolo??",
      h
    );
    expect(out.toLowerCase()).toContain("bolo");
  });

  it("resposta já menciona o bolo → deixa passar", () => {
    const h: H[] = [
      { role: "user", content: "bolo de brigadeiro 1kg" },
    ];
    const resp = "Seu bolo de brigadeiro de 1kg custa R$100.";
    expect(enforceCakeContinuity(resp, "e o bolo?", h)).toBe(resp);
  });

  it("cliente não pergunta sobre bolo → deixa passar", () => {
    const h: H[] = [{ role: "user", content: "bolo de morango 2kg" }];
    const resp = "Mais alguma coisa?";
    expect(enforceCakeContinuity(resp, "quantos docinhos tem?", h)).toBe(resp);
  });
});

describe("buildPreviousQuestionHint", () => {
  it("resposta curta ('2kg') logo após pergunta de peso → retorna hint", () => {
    const h: H[] = [
      { role: "user", content: "quero bolo de chocolate" },
      { role: "assistant", content: "Quantos kg?" },
    ];
    const hint = buildPreviousQuestionHint(h, "2kg");
    expect(hint).toContain("Quantos kg?");
    expect(hint).toContain("2kg");
  });

  it("mensagem muito longa não é tratada como resposta curta", () => {
    const h: H[] = [
      { role: "assistant", content: "Qual sabor?" },
    ];
    const longMsg = "a".repeat(200);
    expect(buildPreviousQuestionHint(h, longMsg)).toBe("");
  });

  it("sem perguntas prévias → vazio", () => {
    expect(buildPreviousQuestionHint([], "2kg")).toBe("");
  });
});
