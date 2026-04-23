import { describe, it, expect } from "vitest";
import { enforceNoTemplatePlaceholders } from "../../../supabase/functions/_shared/priceEngine.ts";

describe("enforceNoTemplatePlaceholders", () => {
  describe("limpeza inline (preserva conteúdo válido)", () => {
    it("remove placeholder + 'Sabores disponíveis' errado, preserva 'Anotado!'", () => {
      const input =
        "Anotado! 50 brigadeiros e 25 empadas de frango. Seu [produto do cardápio] foi adicionado. Sabores disponíveis: abacaxi, xyz, abc.";
      const out = enforceNoTemplatePlaceholders(input);
      expect(out.toLowerCase()).toContain("anotado");
      expect(out.toLowerCase()).toContain("50 brigadeiros");
      expect(out.toLowerCase()).toContain("25 empadas");
      expect(out).not.toMatch(/\[produto/i);
      expect(out.toLowerCase()).not.toContain("sabores disponíveis");
    });

    it("remove [sabor] isolado mas preserva 'Anotei seu pedido de 2kg'", () => {
      const input =
        "Anotei seu pedido de 2kg. Qual [sabor] você quer?";
      const out = enforceNoTemplatePlaceholders(input);
      expect(out.toLowerCase()).toContain("anotei");
      expect(out).not.toMatch(/\[sabor\]/i);
    });

    it("se sobrar só conteúdo inútil, usa fallback 'me confundi'", () => {
      const input = "Ok. [produto do cardápio].";
      const out = enforceNoTemplatePlaceholders(input);
      expect(out.toLowerCase()).toContain("me confundi");
    });

    it("se sobrar só pontuação e espaços, usa fallback", () => {
      const input = "[sabor]. [peso]. [nome].";
      const out = enforceNoTemplatePlaceholders(input);
      expect(out.toLowerCase()).toContain("me confundi");
    });
  });

  describe("casos em que NÃO deve mexer", () => {
    it("resposta sem placeholder passa intacta", () => {
      const input = "Anotado! Seu bolo de 2kg de chocolate custa R$ 180,00.";
      expect(enforceNoTemplatePlaceholders(input)).toBe(input);
    });

    it("conteúdo real entre colchetes NÃO é placeholder", () => {
      const input =
        "Perfeito! [Bolo de Chocolate 3kg] anotado. Total: R$ 270,00.";
      expect(enforceNoTemplatePlaceholders(input)).toBe(input);
    });

    it("nome próprio entre colchetes passa", () => {
      const input = "Oi [Lidy], posso confirmar?";
      expect(enforceNoTemplatePlaceholders(input)).toBe(input);
    });

    it("resposta vazia passa", () => {
      expect(enforceNoTemplatePlaceholders("")).toBe("");
    });
  });

  describe("casos reais observados em produção", () => {
    it("caso real: placeholder no meio + 'sabores disponíveis' alucinado após", () => {
      const input =
        "Perfeito! Anotei 30 coxinha de frango e 20 bolinha de queijo. Qual [sabor do bolo] você prefere? Sabores disponíveis: xxx, yyy, zzz.";
      const out = enforceNoTemplatePlaceholders(input);
      expect(out.toLowerCase()).toContain("30 coxinha");
      expect(out.toLowerCase()).toContain("20 bolinha");
      expect(out).not.toMatch(/\[sabor/i);
      expect(out.toLowerCase()).not.toContain("sabores disponíveis");
    });
  });
});
