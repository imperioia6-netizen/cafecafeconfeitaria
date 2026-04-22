/**
 * Regressão: AGENT mandou Pix/sinal na mesma mensagem em que perguntou
 * "Gostaria de mais alguma coisa ou podemos finalizar?" (caso Lizy).
 *
 * Fluxo correto:
 *   1) Atendente pergunta se quer mais algo
 *   2) Cliente responde "não / só isso / pode finalizar"
 *   3) ENTÃO atendente manda o Pix e pede o sinal de 50%
 *
 * Nunca pular o passo 2.
 */
import { describe, it, expect } from "vitest";
import { enforceAskBeforePayment } from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

const REPLY_MISTURADA = `Seu pedido completo:

- decoração colorida: R$375,00
- 25 mini coxinhas: R$43,75
- 50 empadas de frango: R$95,00
- 25 docinhos de brigadeiro: R$47,50

*Total: R$561,25*

Gostaria de mais alguma coisa ou podemos finalizar? 😊

Para confirmar o pedido, pedimos 50% de sinal: R$280,63 via PIX 😊
Pix no banco nubank no nome de (Sandra Regina)
Chave PIX: 11995287636

Assim que fizer o pagamento, envie o comprovante aqui ou eu confirmar seu pedido!`;

describe("enforceAskBeforePayment — pergunta + Pix não podem ir juntos", () => {
  it("corta o bloco de Pix quando cliente ainda NÃO fechou o pedido", () => {
    const out = enforceAskBeforePayment(
      REPLY_MISTURADA,
      "Quero 25 mini coxinhas, 50 empadas de frango e 25 de brigadeiro",
      []
    );
    // Pergunta de continuidade preservada
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
    // Dados de Pix NÃO podem estar presentes
    expect(out).not.toMatch(/chave\s*pix/i);
    expect(out).not.toMatch(/11995287636/);
    expect(out).not.toMatch(/R\$\s*280,63/);
    expect(out.toLowerCase()).not.toMatch(/50\s*%/);
    expect(out.toLowerCase()).not.toMatch(/sinal/);
    expect(out.toLowerCase()).not.toMatch(/nubank/);
  });

  it("NÃO mexe quando cliente já disse 'pode finalizar'", () => {
    const out = enforceAskBeforePayment(
      REPLY_MISTURADA,
      "pode finalizar",
      []
    );
    expect(out).toBe(REPLY_MISTURADA);
  });

  it("NÃO mexe quando cliente já disse 'só isso' recente no histórico", () => {
    const hist: H[] = [
      { role: "user", content: "quero um bolo" },
      { role: "assistant", content: "Anotado, mais alguma coisa?" },
      { role: "user", content: "só isso mesmo" },
    ];
    const out = enforceAskBeforePayment(REPLY_MISTURADA, "obrigado", hist);
    expect(out).toBe(REPLY_MISTURADA);
  });

  it("resposta sem pergunta de continuidade passa intacta", () => {
    const resp = "Pedido finalizado! Pix: chave@exemplo.com, R$100.";
    const out = enforceAskBeforePayment(resp, "pode finalizar", []);
    expect(out).toBe(resp);
  });

  it("resposta com pergunta mas sem dados de pagamento passa intacta", () => {
    const resp = "Anotei o bolo de chocolate 2kg. Gostaria de mais alguma coisa?";
    const out = enforceAskBeforePayment(resp, "bolo de chocolate 2kg", []);
    expect(out).toBe(resp);
  });

  it("garante que a pergunta continua aparecendo se o corte removeu o final", () => {
    const resp = "Anotei tudo! Podemos finalizar? PIX: 123 R$50.";
    // Sem "pode finalizar" do cliente.
    const out = enforceAskBeforePayment(resp, "quero 1 coxinha", []);
    expect(out.toLowerCase()).toMatch(/finalizar|mais alguma coisa/);
    expect(out).not.toMatch(/PIX:\s*123/);
  });

  it("se marcador de pagamento está bem no início, substitui por mensagem padrão", () => {
    const resp = "PIX: abc123 R$280. Ah, gostaria de mais alguma coisa?";
    const out = enforceAskBeforePayment(resp, "quero coxinha", []);
    expect(out.toLowerCase()).toMatch(/mais alguma coisa|podemos finalizar/);
    expect(out).not.toMatch(/PIX:\s*abc123/);
  });

  it("reconhece variações: 'quer adicionar', 'deseja mais'", () => {
    const r1 = `Anotado! Quer adicionar algo mais?

Pix: xxx R$100`;
    const out1 = enforceAskBeforePayment(r1, "ok", []);
    expect(out1).not.toMatch(/Pix:\s*xxx/);

    const r2 = `Anotado! Deseja mais alguma coisa?

Chave PIX: 999`;
    const out2 = enforceAskBeforePayment(r2, "ok", []);
    expect(out2).not.toMatch(/Chave\s*PIX/i);
  });

  it("reconhece 'nada mais' como fechamento do cliente", () => {
    const out = enforceAskBeforePayment(
      REPLY_MISTURADA,
      "nada mais, obrigado",
      []
    );
    expect(out).toBe(REPLY_MISTURADA);
  });

  it("reconhece 'é isso' / 'é só isso' como fechamento", () => {
    const out = enforceAskBeforePayment(REPLY_MISTURADA, "é isso", []);
    expect(out).toBe(REPLY_MISTURADA);
  });
});
