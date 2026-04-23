/**
 * v242 — wantsNewOrder deve detectar resposta curta "novo/outro" quando
 * atendente perguntou "continuar ou novo?".
 *
 * Bug real: cliente disse apenas "Novo" em resposta a "continuar de onde
 * paramos ou começar um novo?" — wantsNewOrder (que só detectava frases
 * como "quero fazer novo pedido") retornou false. Resultado: sem reset,
 * histórico antigo vazou 2 turnos depois e LLM alucinou com contexto velho.
 */
import { describe, it, expect } from "vitest";
import { wantsNewOrder } from "../../../supabase/functions/_shared/intentDetection.ts";

type H = { role: "user" | "assistant"; content: string };

describe("wantsNewOrder — detecção contextual (v242)", () => {
  const historyPedidoAberto: H[] = [
    { role: "user", content: "oi" },
    {
      role: "assistant",
      content:
        "Oi de novo! 😊 Você tem um pedido em aberto aqui — quer continuar de onde paramos ou começar um novo?",
    },
  ];

  it("cliente 'Novo' após 'continuar ou novo?' → true", () => {
    expect(wantsNewOrder("Novo", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'novo' (lowercase) após pergunta → true", () => {
    expect(wantsNewOrder("novo", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'nova' após pergunta → true", () => {
    expect(wantsNewOrder("nova", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'Outro' após pergunta → true", () => {
    expect(wantsNewOrder("Outro", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'começar' após pergunta → true", () => {
    expect(wantsNewOrder("começar", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'do zero' após pergunta → true", () => {
    expect(wantsNewOrder("do zero", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'refazer' após pergunta → true", () => {
    expect(wantsNewOrder("refazer", historyPedidoAberto)).toBe(true);
  });

  it("cliente 'Novo' SEM histórico de pergunta 'continuar ou novo?' → false", () => {
    const h: H[] = [
      { role: "user", content: "oi" },
      { role: "assistant", content: "Oi! Como posso ajudar?" },
    ];
    // Sem contexto de pergunta, "novo" isolado é ambíguo (pode ser pedido novo
    // OU outro sentido). Não dispara reset.
    expect(wantsNewOrder("Novo", h)).toBe(false);
  });

  it("cliente 'continuar' após pergunta → false (quer continuar, não novo)", () => {
    expect(wantsNewOrder("continuar", historyPedidoAberto)).toBe(false);
  });

  it("cliente 'de onde paramos' → false", () => {
    expect(wantsNewOrder("de onde paramos", historyPedidoAberto)).toBe(false);
  });

  it("mensagem longa mesmo com 'novo' → não usa caminho curto", () => {
    // Frase longa com "novo" só conta se matchou patterns clássicos.
    expect(
      wantsNewOrder(
        "sim quero novo e também quero um bolo grande",
        historyPedidoAberto
      )
    ).toBe(false);
  });

  it("patterns clássicos continuam funcionando (frase completa)", () => {
    expect(wantsNewOrder("quero fazer um novo pedido", [])).toBe(true);
    expect(wantsNewOrder("começar um novo pedido", [])).toBe(true);
    expect(wantsNewOrder("do zero", [])).toBe(true);
    expect(wantsNewOrder("recomeçar", [])).toBe(true);
  });

  it("sem history passa sem erro (compat antiga)", () => {
    expect(wantsNewOrder("quero novo pedido")).toBe(true);
    expect(wantsNewOrder("Novo")).toBe(false); // sem contexto
  });
});
