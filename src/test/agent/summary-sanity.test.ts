/**
 * Regressão dos bugs reportados pelo proprietário:
 *   1. Resumo com "R$545,00" sozinho (sem "Bolo X 5kg —" antes).
 *   2. Cliente pediu "50 empadas de frango", resumo disse "13 empadas".
 *
 * O guardrail sinaliza esses problemas ao final da resposta, em vez de
 * enviar resumo errado silenciosamente.
 */
import { describe, it, expect } from "vitest";
import { enforceOrderSummarySanity } from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("enforceOrderSummarySanity — item picotado (valor sem item)", () => {
  it("bullet '- R$545,00' sozinho dispara aviso", () => {
    const resp = `Anotado, Lidy! Vou adicionar tudo ao seu pedido:
- R$545,00
- 25 Mini Coxinhas: R$43,75
- 50 Empadas de Frango: R$95,00

Total parcial: R$683,75`;
    const out = enforceOrderSummarySanity(resp, []);
    expect(out).not.toBe(resp);
    expect(out.toLowerCase()).toMatch(/confirm|confund|refa[cç]o/);
  });

  it("linha só 'R$545,00' (sem bullet) dispara aviso", () => {
    const resp = `Anotado!

R$545,00
25 mini coxinhas: R$43,75`;
    const out = enforceOrderSummarySanity(resp, []);
    expect(out).not.toBe(resp);
  });

  it("resumo bem formado passa intacto", () => {
    const resp = `Anotado!
- Bolo Trufado 5kg — R$545,00
- 25 Mini Coxinhas — R$43,75
- 50 Empadas de Frango — R$95,00
Total: R$683,75`;
    const out = enforceOrderSummarySanity(resp, []);
    expect(out).toBe(resp);
  });
});

describe("enforceOrderSummarySanity — quantidade trocada", () => {
  const HIST: H[] = [
    {
      role: "user",
      content:
        "Como vou querer tambem 25 mini coxinhas 50 empadas de frango e 50 beijinhos",
    },
    { role: "assistant", content: "anotado" },
    { role: "user", content: "Apenas isso" },
  ];

  it("cliente pediu '50 empadas', resumo diz '13 empadas' → dispara", () => {
    const resp = `Perfeito, Lidy!

- 25 mini coxinhas, 13 empadas de frango: R$47,50
- 50 beijinhos: R$95,00

Total dos itens adicionais: R$142,50`;
    const out = enforceOrderSummarySanity(resp, HIST);
    expect(out).not.toBe(resp);
    expect(out.toLowerCase()).toMatch(/empada|confund|confirm/);
  });

  it("quantidade bate → passa", () => {
    const resp = `Perfeito!
- 25 mini coxinhas — R$43,75
- 50 empadas de frango — R$95,00
- 50 beijinhos — R$95,00
Total: R$233,75`;
    const out = enforceOrderSummarySanity(resp, HIST);
    expect(out).toBe(resp);
  });

  it("cliente pediu '50 brigadeiros', resumo diz '30' → dispara", () => {
    const hist: H[] = [{ role: "user", content: "quero 50 brigadeiros" }];
    const resp = `- 30 brigadeiros: R$47,50`;
    const out = enforceOrderSummarySanity(resp, hist);
    expect(out).not.toBe(resp);
  });

  it("histórico sem item equivalente → não compara", () => {
    const hist: H[] = [{ role: "user", content: "quero bolo" }];
    const resp = `- 25 mini coxinhas — R$43,75`;
    const out = enforceOrderSummarySanity(resp, hist);
    expect(out).toBe(resp);
  });
});

describe("enforceOrderSummarySanity — robustez", () => {
  it("resposta vazia passa", () => {
    expect(enforceOrderSummarySanity("", [])).toBe("");
  });

  it("resposta neutra passa", () => {
    const r = "Oi, como posso ajudar?";
    expect(enforceOrderSummarySanity(r, [])).toBe(r);
  });

  it("variante 'empadas' × 'empada' não falsa positivo", () => {
    const hist: H[] = [{ role: "user", content: "quero 50 empadas" }];
    const resp = `- 50 empadas de frango — R$95,00`;
    expect(enforceOrderSummarySanity(resp, hist)).toBe(resp);
  });
});
