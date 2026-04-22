/**
 * Regressão: no caso Lizy, o agente pressupôs entrega numa ENCOMENDA e pediu
 * endereço/CEP sem perguntar ao cliente se seria entrega ou retirada.
 *
 * Regras:
 *  - Toda ENCOMENDA: perguntar "entrega (delivery) ou retirada?" antes de
 *    pedir endereço ou fechar pedido.
 *  - EXCEÇÃO: se o pedido tem bolo de 4kg, a encomenda é AUTOMATICAMENTE
 *    retirada (não perguntar, só informar).
 */
import { describe, it, expect } from "vitest";
import { enforceEncomendaDeliveryQuestion } from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("enforceEncomendaDeliveryQuestion — regra geral", () => {
  it("encomenda + cliente ainda NÃO escolheu + resposta pede endereço → pergunta tipo", () => {
    const hist: H[] = [
      { role: "user", content: "quero bolo de morango 2kg para encomenda amanhã" },
      { role: "assistant", content: "anotado" },
    ];
    const resp = `Total: R$220,00. Ah, e preciso do seu endereço completo com CEP pra finalizar o cadastro.`;
    const out = enforceEncomendaDeliveryQuestion(resp, "só isso", hist);
    expect(out).not.toMatch(/endere[cç]o/i);
    expect(out).not.toMatch(/cep/i);
    expect(out.toLowerCase()).toMatch(/entrega|retirada/);
  });

  it("cliente JÁ disse 'vai ser retirada' → passa intacto", () => {
    const hist: H[] = [
      { role: "user", content: "bolo de chocolate 2kg encomenda" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "vai ser retirada" },
    ];
    const resp = `Perfeito! Total R$190,00. Podemos finalizar?`;
    const out = enforceEncomendaDeliveryQuestion(resp, "obrigada", hist);
    expect(out).toBe(resp);
  });

  it("cliente JÁ disse 'entrega' → passa intacto, pode pedir endereço", () => {
    const hist: H[] = [
      { role: "user", content: "bolo encomenda 1kg" },
      { role: "user", content: "vai ser entrega" },
    ];
    const resp = `Beleza! Me manda o endereço completo com CEP por favor.`;
    const out = enforceEncomendaDeliveryQuestion(resp, "", hist);
    expect(out).toBe(resp);
  });

  it("fluxo NÃO-encomenda passa intacto", () => {
    const hist: H[] = [
      { role: "user", content: "quero 25 coxinhas para delivery agora" },
    ];
    const resp = `Preciso do seu endereço para calcular a taxa.`;
    const out = enforceEncomendaDeliveryQuestion(resp, "", hist);
    expect(out).toBe(resp);
  });

  it("encomenda sem resposta com endereço E sem pergunta: se está finalizando, ANEXA a pergunta", () => {
    const hist: H[] = [
      { role: "user", content: "bolo de morango 2kg encomenda amanhã" },
    ];
    const resp = `Resumo do pedido: Bolo morango 2kg R$220,00. Total: R$220,00.`;
    const out = enforceEncomendaDeliveryQuestion(resp, "só isso", hist);
    expect(out.toLowerCase()).toMatch(/entrega.*retirada|retirada.*entrega/);
  });

  it("se a resposta já pergunta tipo, não duplica", () => {
    const hist: H[] = [{ role: "user", content: "bolo de morango encomenda" }];
    const resp = `Anotado! Vai ser entrega ou retirada na loja?`;
    const out = enforceEncomendaDeliveryQuestion(resp, "", hist);
    expect(out).toBe(resp);
  });
});

describe("enforceEncomendaDeliveryQuestion — bolo de 4kg força retirada", () => {
  it("pedido com bolo 4kg + resposta pedindo endereço → troca por aviso de retirada", () => {
    const hist: H[] = [
      { role: "user", content: "encomenda bolo de morango 4kg pra sábado" },
    ];
    const resp = `Total R$440,00. Me manda o endereço completo com CEP.`;
    const out = enforceEncomendaDeliveryQuestion(resp, "", hist);
    expect(out).not.toMatch(/endere[cç]o/i);
    expect(out).not.toMatch(/cep/i);
    expect(out.toLowerCase()).toMatch(/4\s*kg/);
    expect(out.toLowerCase()).toMatch(/retirada/);
  });

  it("pedido com bolo 4kg + resposta sem endereço → passa intacto (confia no prompt)", () => {
    const hist: H[] = [
      { role: "user", content: "encomenda bolo brigadeiro 4kg" },
    ];
    const resp = `Bolo 4kg é somente retirada! Total: R$408,00.`;
    const out = enforceEncomendaDeliveryQuestion(resp, "", hist);
    expect(out).toBe(resp);
  });
});

describe("enforceEncomendaDeliveryQuestion — edge cases", () => {
  it("resposta vazia passa intacta", () => {
    expect(enforceEncomendaDeliveryQuestion("", "", [])).toBe("");
  });

  it("respostas pequenas sem menção a pedido ou endereço passam intactas", () => {
    const hist: H[] = [{ role: "user", content: "encomenda bolo 1kg" }];
    const resp = `Claro, qual sabor?`;
    const out = enforceEncomendaDeliveryQuestion(resp, "", hist);
    expect(out).toBe(resp);
  });

  it("cliente disse 'busco na loja' também conta como retirada", () => {
    const hist: H[] = [
      { role: "user", content: "bolo encomenda 1kg" },
      { role: "user", content: "busco na loja" },
    ];
    const resp = `Beleza! Total R$100. Podemos finalizar?`;
    expect(enforceEncomendaDeliveryQuestion(resp, "", hist)).toBe(resp);
  });
});
