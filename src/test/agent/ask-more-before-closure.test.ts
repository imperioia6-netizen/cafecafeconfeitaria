/**
 * Camada extra: quando a resposta apresenta fechamento (total/resumo/"anotei
 * + preço") mas NÃO pergunta "mais alguma coisa?" E o cliente ainda não
 * disse "só isso", anexamos a pergunta ao final. Garante o fluxo:
 *   (1) cliente pede → (2) pergunta "mais algo?" → (3) cliente fecha → (4) pagamento.
 */
import { describe, it, expect } from "vitest";
import { enforceAskMoreBeforeClosure } from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("enforceAskMoreBeforeClosure", () => {
  it("'Total: R$X' sem pergunta → anexa pergunta de continuidade", () => {
    const out = enforceAskMoreBeforeClosure(
      "Anotado. Total: R$258,00",
      "quero bolo trufado 2kg",
      []
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
  });

  it("'Anotei o bolo 2kg' sem pergunta → anexa pergunta", () => {
    const out = enforceAskMoreBeforeClosure(
      "Anotei seu bolo trufado 2kg por R$258,00!",
      "quero bolo trufado 2kg",
      []
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
  });

  it("'Vamos fechar' sem pergunta → anexa", () => {
    const out = enforceAskMoreBeforeClosure(
      "Vamos fechar seu pedido de R$258,00",
      "",
      []
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
  });

  it("resposta já pergunta 'mais alguma coisa?' → passa intacta", () => {
    const resp =
      "Anotado! Total: R$258,00. Gostaria de mais alguma coisa ou podemos fechar?";
    expect(enforceAskMoreBeforeClosure(resp, "", [])).toBe(resp);
  });

  it("cliente disse 'pode fechar' → passa intacta (liberado)", () => {
    const resp = "Total: R$258,00. Vou te mandar o Pix.";
    const out = enforceAskMoreBeforeClosure(resp, "pode fechar", []);
    expect(out).toBe(resp);
  });

  it("cliente disse 'só isso' no histórico recente → passa intacta", () => {
    const hist: H[] = [
      { role: "user", content: "quero bolo" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "só isso" },
    ];
    const resp = "Total: R$258,00. Vou fechar.";
    expect(enforceAskMoreBeforeClosure(resp, "ok", hist)).toBe(resp);
  });

  it("resposta sem indicador de fechamento → passa intacta", () => {
    const resp = "Qual o sabor que você prefere?";
    expect(enforceAskMoreBeforeClosure(resp, "oi", [])).toBe(resp);
  });

  it("'Anotei' sem valor/peso (pergunta neutra) → passa intacta", () => {
    const resp = "Anotei! Qual o próximo item?";
    expect(enforceAskMoreBeforeClosure(resp, "", [])).toBe(resp);
  });

  it("resposta com 'Resumo do pedido' sem pergunta → anexa", () => {
    const out = enforceAskMoreBeforeClosure(
      "Resumo do pedido:\n- Bolo Trufado 2kg: R$258,00\nTotal: R$258,00",
      "quero trufado 2kg",
      []
    );
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
  });
});
