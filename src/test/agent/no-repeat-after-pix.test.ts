/**
 * Regressão: depois de mandar o Pix e pedir o comprovante, o cliente respondeu
 * apenas "ok" e o agente repetiu o resumo inteiro do pedido. O comportamento
 * correto é só aguardar o comprovante — mensagem curta, sem repetir.
 */
import { describe, it, expect } from "vitest";
import { enforceNoRepeatAfterPix } from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

const HIST_DEPOIS_DO_PIX: H[] = [
  { role: "user", content: "só isso" },
  {
    role: "assistant",
    content: `*Total: R$561,25*

Chave PIX: 11995287536 (Nubank - Sandra Regina)
Encomenda pra amanhã (22/04) às 9h ✅

E me manda o comprovante quando fizer o PIX`,
  },
];

const RESUMO_REPETIDO = `Perfeito, Lidy! Vamos fechar então 😊

Resumo do seu pedido:
- decoração colorida: R$375,00
- 25 mini coxinhas: R$43,75
- 50 empadas de frango: R$95,00
- 25 docinhos de brigadeiro: R$47,50

*Total: R$561,25*`;

describe("enforceNoRepeatAfterPix — casos positivos (resumo removido)", () => {
  it("'ok' após Pix → substitui por aguardar comprovante", () => {
    const out = enforceNoRepeatAfterPix(RESUMO_REPETIDO, "ok", HIST_DEPOIS_DO_PIX);
    expect(out.toLowerCase()).toMatch(/aguardo|comprovante/);
    expect(out).not.toMatch(/Total:\s*R\$561,25/);
    expect(out).not.toMatch(/coxinha/i);
  });

  it("'beleza' após Pix → curto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "beleza",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'vou fazer' após Pix → curto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "vou fazer",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'tá certo' após Pix → curto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "tá certo",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'combinado' após Pix → curto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "combinado",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'👍' após Pix → curto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "👍",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });
});

describe("enforceNoRepeatAfterPix — caso real (reenviou resumo após ok)", () => {
  const HIST_REAL: H[] = [
    { role: "user", content: "é isso" },
    {
      role: "assistant",
      content: `*Total: R$506,75*

Para confirmar o pedido, pedimos 50% de sinal: R$253,38 via PIX 😊

Pix no banco nubank no nome de ( Sandra Regina )
Chave PIX: 11998287836

Assim que fizer o pagamento, envie o comprovante aqui pra eu confirmar seu pedido!`,
    },
  ];

  const RESP_REAL_ERRADA = `Entendi, Vitor! Desculpa a confusão! 😅 A escrita "Amo você" no bolo, anotado!

Escrita personalizada: +R$15,00

Seu pedido atualizado:
- Bolo Trufado 2kg — R$258,00
- Escrita "Amo você" — R$15,00
- 25 mini coxinhas — R$43,75
- 50 empadas de frango — R$95,00
- 50 docinhos de brigadeiro — R$95,00

*Total: R$506,75*`;

  it("'ok' após Pix detalhado → resposta longa é substituída", () => {
    const out = enforceNoRepeatAfterPix(RESP_REAL_ERRADA, "ok", HIST_REAL);
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("mesmo que a resposta não tenha 'Total', se for longa depois do PIX + ok, substitui", () => {
    const resp = `Entendi, Vitor! Desculpa a confusão! 😅 A escrita "Amo você" no bolo, anotado!

Escrita personalizada: +R$15,00

Seu pedido atualizado permanece o mesmo, obrigado por confirmar.`;
    const out = enforceNoRepeatAfterPix(resp, "ok", HIST_REAL);
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'pode deixar' após Pix → substitui resumo", () => {
    const out = enforceNoRepeatAfterPix(RESP_REAL_ERRADA, "pode deixar", HIST_REAL);
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'é isso' após Pix → substitui", () => {
    const out = enforceNoRepeatAfterPix(RESP_REAL_ERRADA, "é isso", HIST_REAL);
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });

  it("'isso mesmo' após Pix → substitui", () => {
    const out = enforceNoRepeatAfterPix(RESP_REAL_ERRADA, "isso mesmo", HIST_REAL);
    expect(out).toBe("Beleza! Fico no aguardo do seu comprovante 😊");
  });
});

describe("enforceNoRepeatAfterPix — casos em que NÃO deve mexer", () => {
  it("resposta já é curta (sem resumo) → passa intacta", () => {
    const resp = "Beleza, aguardo o comprovante!";
    expect(
      enforceNoRepeatAfterPix(resp, "ok", HIST_DEPOIS_DO_PIX)
    ).toBe(resp);
  });

  it("atendente ainda NÃO mandou Pix → passa intacto", () => {
    const hist: H[] = [
      { role: "user", content: "quero um bolo" },
      { role: "assistant", content: "claro, qual sabor?" },
    ];
    const out = enforceNoRepeatAfterPix(RESUMO_REPETIDO, "ok", hist);
    expect(out).toBe(RESUMO_REPETIDO);
  });

  it("cliente mandou mensagem LONGA (não é só confirmação) → passa intacto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "ah, acabei de lembrar, pode adicionar mais 25 coxinhas no pedido por favor?",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe(RESUMO_REPETIDO);
  });

  it("cliente mandou mensagem que NÃO é confirmação curta → passa intacto", () => {
    const out = enforceNoRepeatAfterPix(
      RESUMO_REPETIDO,
      "qual a chave pix mesmo?",
      HIST_DEPOIS_DO_PIX
    );
    expect(out).toBe(RESUMO_REPETIDO);
  });

  it("confirmação mas resposta nova não é resumo → passa intacta", () => {
    const resp = "Show, fico aguardando! 😊";
    expect(
      enforceNoRepeatAfterPix(resp, "blz", HIST_DEPOIS_DO_PIX)
    ).toBe(resp);
  });

  it("sem histórico → passa intacto", () => {
    expect(
      enforceNoRepeatAfterPix(RESUMO_REPETIDO, "ok", [])
    ).toBe(RESUMO_REPETIDO);
  });
});
