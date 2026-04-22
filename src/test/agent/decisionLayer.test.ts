import { describe, it, expect } from "vitest";
import {
  preCalcular,
  detectEntities,
} from "../../../supabase/functions/_shared/decisionLayer.ts";
import type { RecipeInfo } from "../../../supabase/functions/_shared/calculator.ts";

const RECEITAS: RecipeInfo[] = [
  { name: "Brigadeiro", sale_price: 100 },
  { name: "Chocolate", sale_price: 95 },
  { name: "Ninho com Nutella", sale_price: 130 },
];

describe("preCalcular — kg quebrado em NÚMEROS", () => {
  it("2,5kg dispara alerta KG_QUEBRADO", () => {
    const r = preCalcular(
      "quero bolo de chocolate 2,5kg",
      "pricing",
      detectEntities("bolo de chocolate 2,5kg"),
      RECEITAS
    );
    expect(r.alertas.join(" ")).toMatch(/KG_QUEBRADO/);
    expect(r.texto).toBe("");
  });

  it("1.5kg dispara alerta KG_QUEBRADO", () => {
    const r = preCalcular(
      "quero bolo brigadeiro 1.5kg",
      "pricing",
      detectEntities("bolo brigadeiro 1.5kg"),
      RECEITAS
    );
    expect(r.alertas.join(" ")).toMatch(/KG_QUEBRADO/);
  });
});

describe("preCalcular — kg quebrado em TEXTO", () => {
  it("'meio kg' dispara KG_QUEBRADO", () => {
    const r = preCalcular(
      "quero meio kg de bolo de chocolate",
      "pricing",
      detectEntities("quero meio kg de bolo de chocolate"),
      RECEITAS
    );
    expect(r.alertas.join(" ")).toMatch(/KG_QUEBRADO/);
  });

  it("'dois e meio kg' dispara KG_QUEBRADO", () => {
    const r = preCalcular(
      "pode ser dois e meio kg de brigadeiro",
      "cakes",
      detectEntities("pode ser dois e meio kg de brigadeiro"),
      RECEITAS
    );
    expect(r.alertas.join(" ")).toMatch(/KG_QUEBRADO/);
  });

  it("'quilo e meio' dispara KG_QUEBRADO", () => {
    const r = preCalcular(
      "quilo e meio de bolo de chocolate",
      "cakes",
      detectEntities("quilo e meio de bolo de chocolate"),
      RECEITAS
    );
    expect(r.alertas.join(" ")).toMatch(/KG_QUEBRADO/);
  });
});

describe("preCalcular — bolo com peso inteiro", () => {
  it("calcula preço × peso", () => {
    const r = preCalcular(
      "quero bolo de chocolate 2kg",
      "cakes",
      detectEntities("quero bolo de chocolate 2kg"),
      RECEITAS
    );
    // NÃO pode ter alerta de kg quebrado (é peso inteiro).
    expect(r.alertas.find((a) => /KG_QUEBRADO/.test(a))).toBeUndefined();
    expect(r.texto).toContain("R$190.00");
  });

  it("peso > 4kg → divide em formas", () => {
    const r = preCalcular(
      "bolo de brigadeiro 6kg",
      "cakes",
      detectEntities("bolo de brigadeiro 6kg"),
      RECEITAS
    );
    expect(r.texto).toContain("formas");
  });
});

describe("preCalcular — salgados", () => {
  it("quantidade inválida (não múltiplo de 25) dispara alerta", () => {
    const r = preCalcular(
      "quero 30 mini salgados",
      "mini_savories",
      detectEntities("quero 30 mini salgados"),
      RECEITAS
    );
    expect(r.alertas.join(" ")).toMatch(/SALGADOS_QUANTIDADE_INVÁLIDA/);
  });

  it("quantidade válida calcula valor", () => {
    const r = preCalcular(
      "quero 50 mini salgados",
      "mini_savories",
      detectEntities("quero 50 mini salgados"),
      RECEITAS
    );
    expect(r.texto).toContain("R$87.50");
  });
});

describe("preCalcular — fatia", () => {
  it("calcula 2 fatias × R$25 = R$50", () => {
    const r = preCalcular(
      "quero 2 fatias de bolo",
      "cake_slice",
      detectEntities("quero 2 fatias de bolo"),
      RECEITAS
    );
    expect(r.texto).toContain("R$50.00");
  });
});

describe("detectEntities", () => {
  it("detecta menção a bolo", () => {
    expect(detectEntities("quero bolo de brigadeiro").mentionsCake).toBe(true);
  });

  it("detecta menção a mini salgado", () => {
    expect(detectEntities("50 mini coxinhas").mentionsMiniSavory).toBe(true);
  });

  it("detecta menção a fatia", () => {
    expect(detectEntities("duas fatias de bolo").mentionsSlice).toBe(true);
  });
});
