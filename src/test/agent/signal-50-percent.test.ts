/**
 * Regressão: agente mandou chave PIX com valor TOTAL (R$578,75) em vez
 * de cobrar só 50% de sinal (R$289,38). Regra do Vault:
 * - Total > R$300: SEMPRE 50% sinal
 * - Mini salgados: SEMPRE 50% sinal (qualquer valor)
 */
import { describe, it, expect } from "vitest";
import { enforceSignalWhenLargeOrder } from "../../../supabase/functions/_shared/priceEngine.ts";
import {
  preCalcular,
  detectEntities,
} from "../../../supabase/functions/_shared/decisionLayer.ts";
import type { RecipeInfo } from "../../../supabase/functions/_shared/calculator.ts";

const RECEITAS: RecipeInfo[] = [
  { name: "Brigadeiro", sale_price: 102 },
  { name: "Trufado", sale_price: 129 },
  { name: "Morango", sale_price: 115 },
];

describe("enforceSignalWhenLargeOrder — adiciona sinal 50% quando falta", () => {
  it("PIX + total R$578 sem menção a sinal → adiciona", () => {
    const resp = `Resumo:
- Bolo Trufado 5kg: R$545,00
- 25 Mini Coxinhas: R$43,75
*Total: R$578,75*

PIX: 11998287836 (Nubank - Sandra Regina)`;
    const out = enforceSignalWhenLargeOrder(resp);
    expect(out).not.toBe(resp);
    expect(out.toLowerCase()).toMatch(/sinal|50\s*%/);
    expect(out).toMatch(/R\$\s*289/);
  });

  it("PIX + total baixo (< R$300) → não mexe", () => {
    const resp = `Total: R$150,00. PIX: 11998287836`;
    expect(enforceSignalWhenLargeOrder(resp)).toBe(resp);
  });

  it("resposta já menciona sinal → passa intacta", () => {
    const resp = `Total: R$578,75. Sinal 50%: R$289,38 via PIX 11998287836`;
    expect(enforceSignalWhenLargeOrder(resp)).toBe(resp);
  });

  it("PIX sem valor → não mexe", () => {
    const resp = `Me manda a chave PIX 11998287836`;
    const out = enforceSignalWhenLargeOrder(resp);
    // Sem valor R$ detectado, não adiciona linha de sinal.
    expect(out).toBe(resp);
  });

  it("resposta sem PIX → passa intacta", () => {
    const resp = `Total: R$400,00`;
    expect(enforceSignalWhenLargeOrder(resp)).toBe(resp);
  });

  it("variante 'entrada' também conta como menção a sinal", () => {
    const resp = `Total R$500. Entrada 50%: R$250. PIX: 11998287836`;
    expect(enforceSignalWhenLargeOrder(resp)).toBe(resp);
  });
});

describe("preCalcular — alerta [SINAL_50] quando total > R$300", () => {
  it("bolo trufado 4kg + salgados passa de R$300 → alerta", () => {
    const msg = "bolo trufado 4kg e 50 mini coxinhas";
    const r = preCalcular(msg, "pre_order", detectEntities(msg), RECEITAS);
    expect(r.alertas.join(" ")).toMatch(/SINAL_50/);
  });

  it("bolo brigadeiro 2kg = R$204 → sem alerta de sinal", () => {
    const msg = "bolo brigadeiro 2kg";
    const r = preCalcular(msg, "cakes", detectEntities(msg), RECEITAS);
    expect(r.alertas.join(" ")).not.toMatch(/SINAL_50/);
  });

  it("mini salgados → alerta SINAL_SALGADOS", () => {
    const msg = "50 mini salgados";
    const r = preCalcular(msg, "mini_savories", detectEntities(msg), RECEITAS);
    expect(r.alertas.join(" ")).toMatch(/SINAL_SALGADOS/);
  });
});
