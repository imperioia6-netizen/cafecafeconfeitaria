import { describe, it, expect } from "vitest";
import {
  splitAboveFourKg,
  detectCakePriceIntent,
  extractBoloRecommendations,
  hasInvalidRecommendation,
  enforceReplyGuardrails,
  extractDecorationRequestFromMessage,
  type RecipeForPrice,
} from "../../../supabase/functions/_shared/priceEngine.ts";

const RECEITAS: RecipeForPrice[] = [
  { name: "Brigadeiro", whole_price: 100, sale_price: 100 },
  { name: "Chocolate", whole_price: 95, sale_price: 95 },
  { name: "Ninho com Nutella", whole_price: 130, sale_price: 130 },
];

describe("splitAboveFourKg", () => {
  it("≤4kg não divide", () => {
    expect(splitAboveFourKg(3)).toEqual([3]);
  });
  it("5kg → 4 + 1", () => {
    expect(splitAboveFourKg(5)).toEqual([4, 1]);
  });
  it("9kg → 4 + 4 + 1", () => {
    expect(splitAboveFourKg(9)).toEqual([4, 4, 1]);
  });
});

describe("detectCakePriceIntent", () => {
  it("sem peso → preço por kg", () => {
    const r = detectCakePriceIntent("qual o preço do bolo de chocolate", RECEITAS);
    expect(r).toContain("R$ 95.00");
    expect(r).toContain("por kg");
  });

  it("com peso inteiro → multiplica", () => {
    const r = detectCakePriceIntent("quanto custa 2kg de bolo brigadeiro", RECEITAS);
    expect(r).toContain("R$ 200.00");
  });

  it("peso quebrado → oferece inferior/superior", () => {
    const r = detectCakePriceIntent(
      "quanto custa 2,5kg de bolo de chocolate",
      RECEITAS
    );
    expect(r).toContain("peso inteiro");
    expect(r).toContain("R$ 190.00");
    expect(r).toContain("R$ 285.00");
  });

  it(">4kg → divide em formas", () => {
    const r = detectCakePriceIntent(
      "quanto fica 5kg do bolo brigadeiro",
      RECEITAS
    );
    expect(r).toContain("4kg + 1kg");
    expect(r).toContain("R$ 500.00");
  });

  it("não é pergunta de preço → null", () => {
    expect(detectCakePriceIntent("oi tudo bem", RECEITAS)).toBeNull();
  });

  it("bolo não encontrado → null", () => {
    expect(
      detectCakePriceIntent("quanto é o bolo de pistache", RECEITAS)
    ).toBeNull();
  });
});

describe("extractBoloRecommendations", () => {
  it("extrai menções a 'bolo de …'", () => {
    const lista = extractBoloRecommendations(
      "temos bolo de chocolate e bolo de ninho com nutella também"
    );
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.join(" ").toLowerCase()).toContain("chocolate");
  });
});

describe("hasInvalidRecommendation", () => {
  const names = ["Brigadeiro", "Chocolate", "Ninho com Nutella"];
  it("resposta só com sabores válidos → false", () => {
    expect(
      hasInvalidRecommendation(
        "Recomendo o bolo de chocolate ou bolo de brigadeiro",
        names
      )
    ).toBe(false);
  });

  it("resposta com sabor alucinado → true", () => {
    expect(
      hasInvalidRecommendation("Que tal um bolo de maracujá com curry?", names)
    ).toBe(true);
  });
});

describe("enforceReplyGuardrails", () => {
  const names = ["Brigadeiro", "Chocolate", "Ninho com Nutella"];

  it("resposta válida passa intacta", () => {
    const resp = "O bolo de chocolate fica R$ 95,00 por kg.";
    expect(enforceReplyGuardrails(resp, names, "quanto o bolo de chocolate?")).toBe(
      resp
    );
  });

  it("resposta com alucinação e pergunta de recomendação → sugere cardápio real", () => {
    const out = enforceReplyGuardrails(
      "Recomendo nosso bolo de maracujá com curry tropical!",
      names,
      "qual você recomenda?"
    );
    expect(out.toLowerCase()).toMatch(/brigadeiro|chocolate|ninho/);
  });
});

describe("extractDecorationRequestFromMessage", () => {
  it("detecta pedido de decoração", () => {
    expect(
      extractDecorationRequestFromMessage("Quero um topo de bolo personalizado")
    ).toBeTruthy();
    expect(
      extractDecorationRequestFromMessage("pode ser com chantininho")
    ).toBeTruthy();
  });

  it("mensagem normal → null", () => {
    expect(
      extractDecorationRequestFromMessage("quanto custa o bolo?")
    ).toBeNull();
  });
});
