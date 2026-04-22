import { describe, it, expect } from "vitest";
import { normalizeForCompare } from "../../../supabase/functions/_shared/webhookUtils.ts";

describe("normalizeForCompare", () => {
  it("remove acentos", () => {
    expect(normalizeForCompare("Maçã")).toBe("maca");
    expect(normalizeForCompare("Açaí")).toBe("acai");
    expect(normalizeForCompare("TRÊS")).toBe("tres");
  });

  it("achata espaços múltiplos", () => {
    expect(normalizeForCompare("bolo   de    chocolate")).toBe("bolo de chocolate");
    expect(normalizeForCompare("  Brigadeiro  ")).toBe("brigadeiro");
  });

  it("lida com string vazia / falsy", () => {
    expect(normalizeForCompare("")).toBe("");
    expect(normalizeForCompare(undefined as unknown as string)).toBe("");
  });

  it("lowercase consistente", () => {
    expect(normalizeForCompare("NinHo COM NUTELLA")).toBe("ninho com nutella");
  });
});
