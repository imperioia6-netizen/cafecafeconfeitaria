/**
 * Regressão: cliente mandou "ola" (saudação nova) e o agente reativou o
 * pedido antigo — enviou resumo, preços (com valor absurdo), desculpas.
 * O correto é CUMPRIMENTAR simples e esperar o cliente dizer o que quer.
 */
import { describe, it, expect } from "vitest";
import { enforceGreetingReset } from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

const RESP_RUIM = `Desculpa a confusão, Vitor! 😅 Anotei a escrita "Amo você" no bolo!
+R$15,00

Seu pedido atualizado:
- Bolo Trufado 2kg — R$258,00
- Escrita "Amo você" — R$15,00
- 25 mini coxinhas — R$43,75
- 50 empadas de frango — R$95,00
- 50 docinhos brigadeiro — R$95,00

*Total: R$506,75*

Entrega quinta (23/04) às 13h. Vai ser delivery, retirada ou encomenda?`;

describe("enforceGreetingReset — saudação não reativa pedido antigo", () => {
  const hist: H[] = [
    { role: "user", content: "quero um bolo" },
    { role: "assistant", content: "claro, qual sabor?" },
    { role: "user", content: "trufado 2kg" },
    {
      role: "assistant",
      content: "Seu comprovante foi verificado e aprovado! ✅ Pedido registrado.",
    },
  ];

  it("'ola' + resposta com resumo → substitui por cumprimento", () => {
    const out = enforceGreetingReset(RESP_RUIM, "ola", hist);
    expect(out).not.toMatch(/desculpa\s+a\s+confus/i);
    expect(out).not.toMatch(/pedido atualizado/i);
    expect(out).not.toMatch(/Bolo Trufado/i);
    expect(out).not.toMatch(/R\$\s*\d/);
    expect(out.toLowerCase()).toMatch(/oi|ajudar/);
  });

  it("'oi' → cumprimento", () => {
    const out = enforceGreetingReset(RESP_RUIM, "oi", hist);
    expect(out.toLowerCase()).toMatch(/ajudar|oi/);
  });

  it("'bom dia' → cumprimento", () => {
    const out = enforceGreetingReset(RESP_RUIM, "bom dia", hist);
    expect(out.toLowerCase()).toMatch(/ajudar|oi/);
  });

  it("'boa tarde!' → cumprimento", () => {
    const out = enforceGreetingReset(RESP_RUIM, "boa tarde!", hist);
    expect(out.toLowerCase()).toMatch(/ajudar|oi/);
  });

  it("'opa' → cumprimento", () => {
    const out = enforceGreetingReset(RESP_RUIM, "opa", hist);
    expect(out.toLowerCase()).toMatch(/ajudar|oi/);
  });
});

describe("enforceGreetingReset — casos em que NÃO deve mexer", () => {
  it("cliente não saudou (mandou pedido real) → passa intacto", () => {
    const hist: H[] = [];
    const out = enforceGreetingReset(RESP_RUIM, "quero bolo trufado 2kg", hist);
    expect(out).toBe(RESP_RUIM);
  });

  it("cliente saudou mas resposta já é curta/cumprimento → passa", () => {
    const resp = "Oi! Como posso te ajudar?";
    expect(enforceGreetingReset(resp, "ola", [])).toBe(resp);
  });

  it("cliente saudou mas resposta neutra sem preços/resumo → passa", () => {
    const resp = "Que bom te ver de novo! Algum pedido hoje?";
    expect(enforceGreetingReset(resp, "oi", [])).toBe(resp);
  });

  it("cliente mandou mensagem longa (não é saudação pura) → passa", () => {
    const out = enforceGreetingReset(
      RESP_RUIM,
      "oi, pode adicionar mais 25 brigadeiros no meu pedido por favor?",
      []
    );
    expect(out).toBe(RESP_RUIM);
  });

  it("primeira saudação do dia (sem histórico de atendente) → cumprimenta boas-vindas", () => {
    const out = enforceGreetingReset(RESP_RUIM, "oi", []);
    expect(out.toLowerCase()).toMatch(/bem.?vindo|oi/);
  });
});
