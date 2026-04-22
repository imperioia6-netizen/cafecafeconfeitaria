/**
 * Regressão: AGENT CONFUNDIU "flores" (decoração) com SABOR no caso real da cliente Lizy.
 * Frase: "Decoração colorida com flores com borbitas, será encomenda".
 *
 * Expectativa: o sistema NUNCA pode inferir "flores" como sabor. Sabor só sai
 * do cardápio; decoração é visual. Este arquivo ancora a separação.
 */
import { describe, it, expect } from "vitest";
import {
  preCalcular,
  detectEntities,
} from "../../../supabase/functions/_shared/decisionLayer.ts";
import {
  messageMentionsDecoration,
  extractDecorationRequestFromMessage,
} from "../../../supabase/functions/_shared/priceEngine.ts";
import { buildOrderMemoryHint } from "../../../supabase/functions/_shared/conversationMemory.ts";
import type { RecipeInfo } from "../../../supabase/functions/_shared/calculator.ts";

const RECEITAS: RecipeInfo[] = [
  { name: "Brigadeiro", sale_price: 102 },
  { name: "Chocolate", sale_price: 95 },
  { name: "Morango", sale_price: 110 },
  { name: "Ninho com Nutella", sale_price: 130 },
  { name: "Floresta Negra", sale_price: 109 },
  { name: "Trufado", sale_price: 129 },
];

describe("messageMentionsDecoration", () => {
  it("pega 'decoração colorida com flores'", () => {
    expect(
      messageMentionsDecoration("Decoração colorida com flores com bolinhas")
    ).toBe(true);
  });

  it("pega 'bolo colorido' / 'florido' / 'com bolinhas'", () => {
    expect(messageMentionsDecoration("bolo colorido")).toBe(true);
    expect(messageMentionsDecoration("bolo florido")).toBe(true);
    expect(messageMentionsDecoration("com bolinhas de confeito")).toBe(true);
  });

  it("pega temas / personagens", () => {
    expect(messageMentionsDecoration("tema Homem Aranha")).toBe(true);
    expect(messageMentionsDecoration("tema Princesa")).toBe(true);
    expect(messageMentionsDecoration("com Patrulha Canina")).toBe(true);
  });

  it("não confunde 'morango' com decoração", () => {
    expect(messageMentionsDecoration("bolo de morango")).toBe(false);
    expect(messageMentionsDecoration("quero brigadeiro")).toBe(false);
  });
});

describe("preCalcular — decoração NÃO vira sabor (caso Lizy)", () => {
  const msg = "Decoração colorida com flores com borbitas, será encomenda";

  it("dispara alerta DECORAÇÃO_NÃO_É_SABOR quando mensagem é só decoração", () => {
    const r = preCalcular("cake", "cakes", detectEntities(msg), RECEITAS);
    const alertaAll = r.alertas.join(" ") + preCalcular(msg, "cakes", detectEntities(msg), RECEITAS).alertas.join(" ");
    // Chamando também com a própria msg de decoração.
    const r2 = preCalcular(msg, "cakes", detectEntities(msg), RECEITAS);
    expect(r2.alertas.join(" ")).toMatch(/DECORAÇÃO_NÃO_É_SABOR/);
    // Não devemos ter [REFERÊNCIA] inferida para "flores"/"bolinhas".
    expect(r2.texto).not.toMatch(/Bolo\s+flores/i);
    expect(r2.texto).not.toMatch(/Bolo\s+bolinhas/i);
  });

  it("NÃO dispara alerta quando cliente mencionou sabor do cardápio + decoração", () => {
    const msgComSabor = "bolo de morango com decoração de flores coloridas";
    const r = preCalcular(
      msgComSabor,
      "cakes",
      detectEntities(msgComSabor),
      RECEITAS
    );
    // Aqui já existe sabor reconhecível — não precisa do alerta de confusão.
    expect(r.alertas.join(" ")).not.toMatch(/DECORAÇÃO_NÃO_É_SABOR/);
  });

  it("adiciona [CÁLCULO] Decoração +R$30 quando detecta decoração", () => {
    const r = preCalcular(msg, "cakes", detectEntities(msg), RECEITAS);
    expect(r.texto).toMatch(/Decorac|Decoraç/i);
    expect(r.texto).toContain("R$30");
  });

  it("não cria [REFERÊNCIA] de sabor a partir de frase só de decoração", () => {
    const msgDecoOnly = "quero com flores coloridas no bolo";
    const r = preCalcular(
      msgDecoOnly,
      "cakes",
      detectEntities(msgDecoOnly),
      RECEITAS
    );
    // Sem sabor do cardápio, NÃO pode haver referência.
    expect(r.texto).not.toMatch(/REFERÊNCIA/);
  });
});

describe("buildOrderMemoryHint — flavor não engole a decoração", () => {
  it("cliente falou 'bolo de morango com decoração de flores' → flavor fica 'morango'", () => {
    const hint = buildOrderMemoryHint([
      {
        role: "user",
        content: "bolo de morango com decoração de flores coloridas",
      },
    ]);
    expect(hint).toMatch(/SABOR:\s*morango/i);
    expect(hint).not.toMatch(/SABOR:\s*morango\s+com\s+decora/i);
  });

  it("frase só de decoração NÃO gera SABOR:", () => {
    const hint = buildOrderMemoryHint([
      {
        role: "user",
        content: "decoração colorida com flores com bolinhas",
      },
    ]);
    expect(hint).not.toMatch(/SABOR:\s*flor/i);
    expect(hint).not.toMatch(/SABOR:\s*colorid/i);
    expect(hint).not.toMatch(/SABOR:\s*bolinh/i);
  });
});

describe("extractDecorationRequestFromMessage (funciona no caso Lizy)", () => {
  it("captura a descrição completa da decoração", () => {
    expect(
      extractDecorationRequestFromMessage(
        "Decoração colorida com flores com bolinhas, será encomenda"
      )
    ).toMatch(/flores/);
  });

  it("retorna null para pergunta neutra", () => {
    expect(extractDecorationRequestFromMessage("quanto custa?")).toBeNull();
  });
});
