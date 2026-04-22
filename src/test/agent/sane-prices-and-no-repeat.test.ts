/**
 * Regressão: (1) LLM inventou "R$15,008,00" (duas vírgulas) pra bolo trufado 2kg,
 * cujo valor correto é R$258,00; (2) LLM repetiu a mesma mensagem de "desculpa
 * a confusão" duas vezes seguidas.
 */
import { describe, it, expect } from "vitest";
import {
  detectInsanePrices,
  enforceSanePrices,
  enforceNoExactRepeat,
} from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("detectInsanePrices — formato BRL inválido", () => {
  it("'R$15,008,00' (duas vírgulas) é inválido", () => {
    const r = detectInsanePrices("Bolo Trufado 2kg — R$15,008,00");
    expect(r.hasInsane).toBe(true);
    expect(r.offenders.join(" ")).toMatch(/R\$\s*15,008,00/);
  });

  it("'R$15.008.00' (dois pontos com final .00) também inválido", () => {
    const r = detectInsanePrices("Bolo — R$15.008.00");
    expect(r.hasInsane).toBe(true);
  });

  it("formato válido 'R$1.234,56' passa", () => {
    const r = detectInsanePrices("Total: R$1.234,56");
    expect(r.hasInsane).toBe(false);
  });

  it("formato simples 'R$258,00' passa", () => {
    const r = detectInsanePrices("Bolo Trufado 2kg: R$258,00");
    expect(r.hasInsane).toBe(false);
  });

  it("'R$43,75' (mini coxinhas) passa", () => {
    const r = detectInsanePrices("25 mini coxinhas — R$43,75");
    expect(r.hasInsane).toBe(false);
  });
});

describe("detectInsanePrices — valor absurdo", () => {
  it("R$15008 para item simples é marcado como absurdo", () => {
    const r = detectInsanePrices("Bolo: R$15.008,00");
    expect(r.hasInsane).toBe(true);
  });

  it("R$258,00 é plausível", () => {
    const r = detectInsanePrices("Bolo: R$258,00");
    expect(r.hasInsane).toBe(false);
  });

  it("total R$3.500 passa (ainda plausível)", () => {
    const r = detectInsanePrices("Total: R$3.500,00");
    expect(r.hasInsane).toBe(false);
  });
});

describe("enforceSanePrices — substitui resposta com preço absurdo", () => {
  const RESP_RUIM = `Ah, entendi, Vitor! Desculpa a confusão! 😅 "Amo você" é a escrita.

Seu pedido atualizado:
- Bolo Trufado 2kg — R$15,008,00
- Escrita "Amo você" — R$15,00
- 25 mini coxinhas — R$43,75
*Total: R$506,75*`;

  it("troca por aviso de conferência", () => {
    const out = enforceSanePrices(RESP_RUIM);
    expect(out).not.toMatch(/15,008/);
    expect(out.toLowerCase()).toMatch(/conferir|valores|segundinho/);
  });

  it("resposta com preços OK passa intacta", () => {
    const resp = `- Bolo Trufado 2kg — R$258,00
- 25 mini coxinhas — R$43,75
*Total: R$301,75*`;
    expect(enforceSanePrices(resp)).toBe(resp);
  });

  it("resposta vazia passa intacta", () => {
    expect(enforceSanePrices("")).toBe("");
  });
});

describe("enforceNoExactRepeat — evita reenviar mesma mensagem", () => {
  const MSG = `Ah, entendi, Vitor! Desculpa a confusão! 😅 "Amo você" é a escrita que você quer no bolo, né? Anotado!

Escrita personalizada: +R$15,00

Seu pedido atualizado:
- Bolo Trufado 2kg — R$258,00
- Escrita "Amo você" — R$15,00
*Total: R$273,00*

Gostaria de mais alguma coisa ou podemos fechar?`;

  it("mesmo texto repetido → substitui por continuidade", () => {
    const hist: H[] = [
      { role: "user", content: "quero escrita amo voce" },
      { role: "assistant", content: MSG },
      { role: "user", content: "pode fechar" },
    ];
    const out = enforceNoExactRepeat(MSG, hist);
    expect(out).not.toBe(MSG);
    expect(out.toLowerCase()).toMatch(/prosseguir|certo/);
  });

  it("texto diferente passa intacto", () => {
    const hist: H[] = [
      { role: "assistant", content: "Anotado! Qual o sabor?" },
    ];
    const resp = "Beleza! Vou preparar o Pix, um momento 😊";
    expect(enforceNoExactRepeat(resp, hist)).toBe(resp);
  });

  it("resposta curta (<=40 chars) não dispara repetição", () => {
    const hist: H[] = [{ role: "assistant", content: "ok" }];
    const out = enforceNoExactRepeat("ok", hist);
    expect(out).toBe("ok");
  });

  it("histórico sem atendente prévio → passa", () => {
    const hist: H[] = [{ role: "user", content: "oi" }];
    const resp = "Oi! Como posso ajudar?";
    expect(enforceNoExactRepeat(resp, hist)).toBe(resp);
  });

  it("mudança significativa (só prefixo igual) passa", () => {
    const hist: H[] = [
      {
        role: "assistant",
        content:
          "Anotado! Gostaria de mais alguma coisa ou podemos fechar?",
      },
    ];
    const resp = "Anotado! Vou te mandar a chave Pix agora 😊";
    // Prefixo comum: "anotado". Mas resto é diferente. Não deve ser flagged.
    const out = enforceNoExactRepeat(resp, hist);
    expect(out).toBe(resp);
  });
});
