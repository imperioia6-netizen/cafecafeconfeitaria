/**
 * Regressão: no pedido da Lizy o agente (a) esqueceu o BOLO no resumo e
 * (b) adicionou "Escrita personalizada +R$15" sem o cliente ter pedido.
 */
import { describe, it, expect } from "vitest";
import {
  enforcePhantomWritingRemoval,
} from "../../../supabase/functions/_shared/priceEngine.ts";
import { enforceOrderSummaryCompleteness } from "../../../supabase/functions/_shared/conversationMemory.ts";

type H = { role: "user" | "assistant"; content: string };

// ── 1. Escrita fantasma ───────────────────────────────────────────────

describe("enforcePhantomWritingRemoval", () => {
  const RESUMO_COM_ESCRITA = `Resumo do seu pedido:
- Bolo de morango 5kg + decoração colorida (flores) + escrita: R$545,00 + R$30,00 + R$15,00 = R$590,00
- 25 mini coxinhas: R$43,75
- 50 empadas de frango: R$95,00

*Total: R$713,75*`;

  it("remove +R$15 e menção à escrita quando cliente NUNCA pediu", () => {
    const hist: H[] = [
      { role: "user", content: "quero bolo de morango 5kg com decoração colorida de flores" },
      { role: "assistant", content: "anotado" },
      { role: "user", content: "25 mini coxinhas e 50 empadas de frango" },
    ];
    const out = enforcePhantomWritingRemoval(
      RESUMO_COM_ESCRITA,
      "só isso",
      hist
    );
    expect(out).not.toMatch(/escrita/i);
    expect(out).not.toMatch(/\+\s*R\$\s*15/);
  });

  it("NÃO mexe quando cliente pediu 'com a frase Feliz Aniversário'", () => {
    const hist: H[] = [
      {
        role: "user",
        content:
          "bolo de chocolate 2kg com decoração colorida e a frase Feliz Aniversário",
      },
    ];
    const resp = `Bolo de chocolate 2kg: R$190,00
Decoração colorida: +R$30,00
Escrita personalizada: +R$15,00
Total: R$235,00`;
    const out = enforcePhantomWritingRemoval(resp, "bora pagar", hist);
    expect(out).toBe(resp);
  });

  it("NÃO mexe quando cliente pediu 'escrever Eu te amo'", () => {
    const hist: H[] = [
      { role: "user", content: "bolo de brigadeiro, quero escrever Eu te amo" },
    ];
    const resp = `Escrita personalizada: +R$15,00`;
    expect(enforcePhantomWritingRemoval(resp, "", hist)).toBe(resp);
  });

  it("NÃO toca em outros '+R$' de taxa de entrega", () => {
    const hist: H[] = [{ role: "user", content: "quero bolo 1kg para delivery" }];
    const resp = `Bolo 1kg: R$95,00
Taxa de entrega: +R$15,00
Total: R$110,00`;
    // "Taxa de entrega +R$15" NÃO é escrita e o cliente não pediu escrita.
    const out = enforcePhantomWritingRemoval(resp, "obrigada", hist);
    // A linha da taxa de entrega deve permanecer.
    expect(out).toMatch(/Taxa de entrega/);
  });

  it("remove 'Escrita personalizada' como item do bullet", () => {
    const hist: H[] = [{ role: "user", content: "bolo de morango 2kg com flores" }];
    const resp = `- Bolo morango 2kg: R$220,00
- Decoração colorida: R$30,00
- Escrita personalizada: R$15,00`;
    const out = enforcePhantomWritingRemoval(resp, "", hist);
    expect(out).not.toMatch(/Escrita/i);
    expect(out).toMatch(/Bolo morango/i);
    expect(out).toMatch(/Decoração/i);
  });
});

// ── 2. Resumo esqueceu item ──────────────────────────────────────────

describe("enforceOrderSummaryCompleteness", () => {
  const HIST_COM_BOLO: H[] = [
    { role: "user", content: "quero um bolo de morango 5kg para encomenda amanhã" },
    { role: "assistant", content: "anotado" },
    { role: "user", content: "25 mini coxinhas, 50 empadas de frango e 25 brigadeiros" },
  ];

  it("quando o resumo esquece o bolo, injeta aviso de conferência", () => {
    const resp = `Resumo do seu pedido:
- 25 mini coxinhas: R$43,75
- 50 empadas de frango: R$95,00
- 25 brigadeiros: R$47,50
*Total: R$186,25*`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_COM_BOLO);
    expect(out.toLowerCase()).toMatch(/bolo/);
    expect(out.toLowerCase()).toMatch(/conferir|esqueci|confirmar/);
  });

  it("resumo completo passa intacto", () => {
    const resp = `Resumo do seu pedido:
- Bolo morango 5kg: R$545,00
- 25 mini coxinhas: R$43,75
- 50 empadas de frango: R$95,00
- 25 brigadeiros: R$47,50
*Total: R$731,25*`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_COM_BOLO);
    expect(out).toBe(resp);
  });

  it("resposta que NÃO é resumo passa intacta", () => {
    const resp = "Claro, qual o sabor do bolo que você quer?";
    const out = enforceOrderSummaryCompleteness(resp, HIST_COM_BOLO);
    expect(out).toBe(resp);
  });

  it("histórico sem bolo: resumo só de salgados passa intacto", () => {
    const hist: H[] = [{ role: "user", content: "25 mini coxinhas para hoje" }];
    const resp = `Resumo do pedido:
- 25 mini coxinhas: R$43,75
*Total: R$43,75*`;
    expect(enforceOrderSummaryCompleteness(resp, hist)).toBe(resp);
  });

  it("esqueceu salgados do histórico", () => {
    const hist: H[] = [
      { role: "user", content: "bolo de chocolate 2kg" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "e 50 mini coxinhas" },
    ];
    const resp = `Resumo:
- Bolo chocolate 2kg: R$190,00
*Total: R$190,00*`;
    const out = enforceOrderSummaryCompleteness(resp, hist);
    expect(out.toLowerCase()).toMatch(/salgad|mini|coxinha/);
  });
});
