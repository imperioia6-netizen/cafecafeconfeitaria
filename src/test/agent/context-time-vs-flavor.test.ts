/**
 * Regressão: cliente disse "pode ser as 9 de amanhã" (horário da encomenda) e
 * o agente interpretou "ser as" como sabor inexistente. Também "o sabor do
 * bolo é morango" virou "é morango".
 *
 * Fix: (1) detectar contexto temporal, (2) extrair sabor filtrando tokens
 * funcionais/temporais, (3) reconhecer padrão explícito "sabor é X",
 * (4) reescrever respostas que rejeitam fragmentos como sabor.
 */
import { describe, it, expect } from "vitest";
import {
  messageIsAboutTime,
  enforceNoFragmentAsFlavor,
} from "../../../supabase/functions/_shared/priceEngine.ts";
import {
  preCalcular,
  detectEntities,
} from "../../../supabase/functions/_shared/decisionLayer.ts";
import { buildOrderMemoryHint } from "../../../supabase/functions/_shared/conversationMemory.ts";
import type { RecipeInfo } from "../../../supabase/functions/_shared/calculator.ts";

const RECEITAS: RecipeInfo[] = [
  { name: "Brigadeiro", sale_price: 102 },
  { name: "Morango", sale_price: 110 },
  { name: "Sonho de Morango", sale_price: 130 },
  { name: "Trufado Preto de Morango", sale_price: 135 },
  { name: "Chocolate", sale_price: 95 },
];

type H = { role: "user" | "assistant"; content: string };

describe("messageIsAboutTime", () => {
  it("detecta 'pode ser as 9 de amanhã'", () => {
    expect(messageIsAboutTime("pode ser as 9 de amanhã")).toBe(true);
  });
  it("detecta 'pode ser as 9 deamanha'", () => {
    expect(messageIsAboutTime("pode ser as 9 deamanha")).toBe(true);
  });
  it("detecta '9h'", () => {
    expect(messageIsAboutTime("vai ser às 9h")).toBe(true);
  });
  it("detecta 'amanhã' / 'segunda' / 'feriado'", () => {
    expect(messageIsAboutTime("amanhã está bom")).toBe(true);
    expect(messageIsAboutTime("pode ser na segunda")).toBe(true);
    expect(messageIsAboutTime("é para feriado")).toBe(true);
  });
  it("'10:30' também conta", () => {
    expect(messageIsAboutTime("10:30 fica ótimo")).toBe(true);
  });
  it("sabor puro não vira tempo", () => {
    expect(messageIsAboutTime("quero bolo de morango")).toBe(false);
    expect(messageIsAboutTime("brigadeiro")).toBe(false);
  });
});

describe("preCalcular — contexto temporal injeta alerta", () => {
  it("'pode ser as 9 de amanhã' dispara [CONTEXTO_TEMPORAL]", () => {
    const msg = "pode ser as 9 de amanhã";
    const r = preCalcular(msg, "pre_order", detectEntities(msg), RECEITAS);
    expect(r.alertas.join(" ")).toMatch(/CONTEXTO_TEMPORAL/);
  });

  it("frase temporal NÃO gera [REFERÊNCIA] de sabor", () => {
    const msg = "pode ser as 9 de amanhã";
    const r = preCalcular(msg, "pre_order", detectEntities(msg), RECEITAS);
    expect(r.texto).not.toMatch(/REFER[ÊE]NCIA/);
    expect(r.texto).not.toMatch(/Bolo\s+ser/i);
  });

  it("'amanhã às 10h' não gera sabor", () => {
    const msg = "amanhã às 10h está bom";
    const r = preCalcular(msg, "pre_order", detectEntities(msg), RECEITAS);
    expect(r.texto).not.toMatch(/REFER[ÊE]NCIA/);
  });
});

describe("enforceNoFragmentAsFlavor — blockia respostas absurdas", () => {
  it("'o sabor ser as não temos' → pergunta aberta", () => {
    const resp = `Vitor, 🎂 O sabor "ser as" não temos no cardápio. Nossos sabores: Brigadeiro, Morango.`;
    const out = enforceNoFragmentAsFlavor(resp);
    expect(out).not.toMatch(/ser as/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma.*sabor/);
  });

  it("'bolo de é morango não temos' → pergunta aberta", () => {
    const resp = `Bolo só de "é morango" não temos, mas temos: Sonho de Morango.`;
    const out = enforceNoFragmentAsFlavor(resp);
    expect(out).not.toMatch(/é morango/i);
    expect(out.toLowerCase()).toMatch(/qual.*sabor|confirma.*sabor/);
  });

  it("'sabor das 9 não existe' (fragmento temporal) → pergunta aberta", () => {
    const resp = `O sabor "das 9" não existe no nosso cardápio.`;
    const out = enforceNoFragmentAsFlavor(resp);
    expect(out.toLowerCase()).toMatch(/qual.*sabor/);
  });

  it("rejeição REAL de sabor passa intacta ('pistache não temos')", () => {
    const resp = `O sabor "pistache" não temos no cardápio, mas temos brigadeiro e morango.`;
    const out = enforceNoFragmentAsFlavor(resp);
    expect(out).toBe(resp);
  });

  it("rejeição real com 2 palavras reais passa intacta ('red velvet')", () => {
    const resp = `O sabor "red velvet" não temos por enquanto.`;
    const out = enforceNoFragmentAsFlavor(resp);
    expect(out).toBe(resp);
  });

  it("resposta neutra (sem rejeição) passa intacta", () => {
    const resp = "Claro, qual o sabor do bolo que você prefere?";
    expect(enforceNoFragmentAsFlavor(resp)).toBe(resp);
  });
});

describe("buildOrderMemoryHint — 'o sabor do bolo é morango'", () => {
  it("captura 'morango', não 'é morango'", () => {
    const h: H[] = [
      { role: "assistant", content: "Qual sabor?" },
      { role: "user", content: "o sabor do bolo é morango" },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/SABOR:\s*morango/i);
    expect(hint).not.toMatch(/SABOR:\s*é\s*morango/i);
  });

  it("'o sabor vai ser brigadeiro'", () => {
    const h: H[] = [
      { role: "user", content: "o sabor vai ser brigadeiro" },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/SABOR:\s*brigadeiro/i);
  });

  it("'sabor: chocolate'", () => {
    const h: H[] = [{ role: "user", content: "sabor: chocolate" }];
    const hint = buildOrderMemoryHint(h);
    expect(hint).toMatch(/SABOR:\s*chocolate/i);
  });

  it("frase de horário NÃO gera sabor fantasma", () => {
    const h: H[] = [
      { role: "user", content: "pode ser as 9 de amanhã então" },
    ];
    const hint = buildOrderMemoryHint(h);
    expect(hint).not.toMatch(/SABOR:\s*ser/i);
    expect(hint).not.toMatch(/SABOR:\s*as/i);
  });

  it("bolo + horário combinados NÃO geram SABOR com tempo dentro", () => {
    const h: H[] = [
      {
        role: "user",
        content: "quero um bolo de brigadeiro para amanhã as 10",
      },
    ];
    const hint = buildOrderMemoryHint(h);
    // A confirmação de SABOR deve ser só "brigadeiro" — sem para/as/amanhã.
    const saborLine = hint.match(/SABOR:\s*([^\(]+)/i)?.[1].trim() || "";
    expect(saborLine.toLowerCase()).toMatch(/brigadeiro/);
    expect(saborLine.toLowerCase()).not.toMatch(/amanh/);
    expect(saborLine.toLowerCase()).not.toMatch(/\bas\b/);
    expect(saborLine.toLowerCase()).not.toMatch(/\bpara\b/);
  });
});
