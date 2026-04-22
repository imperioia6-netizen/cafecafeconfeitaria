import { describe, it, expect } from "vitest";
import {
  buscarPrecoKg,
  calcularBolo,
  calcularBoloMeioAMeio,
  calcularSalgados,
  validarQuantidadeSalgados,
  dividirBoloGrande,
  calcularEntrada,
  calcularFatias,
  verificarMinimoDelivery,
  type RecipeInfo,
} from "../../../supabase/functions/_shared/calculator.ts";

const RECEITAS: RecipeInfo[] = [
  { name: "Brigadeiro", sale_price: 100 },
  { name: "Ninho com Nutella", sale_price: 130 },
  { name: "Açaí", sale_price: 55 },
  { name: "Morango com chocolate", sale_price: 110 },
];

describe("buscarPrecoKg — matching robusto", () => {
  it("acha com nome exato", () => {
    expect(buscarPrecoKg("Brigadeiro", RECEITAS)).toBe(100);
  });

  it("ignora acentos (cliente digita 'acai', receita é 'Açaí')", () => {
    expect(buscarPrecoKg("acai", RECEITAS)).toBe(55);
    expect(buscarPrecoKg("AÇAÍ", RECEITAS)).toBe(55);
  });

  it("ignora maiúsculas/minúsculas e espaços extras", () => {
    expect(buscarPrecoKg("  brigadeiro  ", RECEITAS)).toBe(100);
    expect(buscarPrecoKg("BRIGADEIRO", RECEITAS)).toBe(100);
  });

  it("faz match parcial quando cliente abrevia sabor (ex.: 'ninho' → 'Ninho com Nutella')", () => {
    expect(buscarPrecoKg("ninho", RECEITAS)).toBe(130);
  });

  it("faz match parcial no sentido inverso (receita mais curta que input)", () => {
    expect(buscarPrecoKg("Brigadeiro Belga", RECEITAS)).toBe(100);
  });

  it("retorna null quando sabor não existe", () => {
    expect(buscarPrecoKg("Sabor Inexistente XYZ", RECEITAS)).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(buscarPrecoKg("", RECEITAS)).toBeNull();
    expect(buscarPrecoKg("   ", RECEITAS)).toBeNull();
  });
});

describe("calcularBolo", () => {
  it("multiplica preço/kg × peso", () => {
    const r = calcularBolo("Brigadeiro", 2, RECEITAS);
    expect(r).not.toBeNull();
    expect(r!.valor).toBe(200);
    expect(r!.precoKg).toBe(100);
  });

  it("funciona com acentos do cliente", () => {
    const r = calcularBolo("açaí", 1, RECEITAS);
    expect(r!.valor).toBe(55);
  });

  it("retorna null para sabor desconhecido", () => {
    expect(calcularBolo("Pistache", 2, RECEITAS)).toBeNull();
  });
});

describe("calcularBoloMeioAMeio", () => {
  it("usa o MAIOR preço/kg", () => {
    const r = calcularBoloMeioAMeio("Brigadeiro", "Ninho com Nutella", 2, RECEITAS);
    expect(r).not.toBeNull();
    expect(r!.precoKg).toBe(130);
    expect(r!.valor).toBe(260);
    expect(r!.saborMaisCaro).toBe("Ninho com Nutella");
  });

  it("retorna null se algum sabor não existe", () => {
    expect(
      calcularBoloMeioAMeio("Brigadeiro", "Pistache", 2, RECEITAS)
    ).toBeNull();
  });
});

describe("validarQuantidadeSalgados", () => {
  it("aceita múltiplos de 25", () => {
    expect(validarQuantidadeSalgados(25).valido).toBe(true);
    expect(validarQuantidadeSalgados(50).valido).toBe(true);
    expect(validarQuantidadeSalgados(100).valido).toBe(true);
    expect(validarQuantidadeSalgados(175).valido).toBe(true);
  });

  it("recusa quantidade abaixo de 25", () => {
    expect(validarQuantidadeSalgados(10).valido).toBe(false);
    expect(validarQuantidadeSalgados(24).valido).toBe(false);
  });

  it("recusa quantidade não múltipla de 25 e sugere inferior/superior", () => {
    const r = validarQuantidadeSalgados(30);
    expect(r.valido).toBe(false);
    expect(r.sugestaoInferior).toBe(25);
    expect(r.sugestaoSuperior).toBe(50);
  });

  it("ajusta inferior para o mínimo quando qtd < 25", () => {
    const r = validarQuantidadeSalgados(10);
    expect(r.sugestaoInferior).toBe(25);
    expect(r.sugestaoSuperior).toBe(25);
  });
});

describe("calcularSalgados", () => {
  it("R$175 por cento", () => {
    expect(calcularSalgados(100).valor).toBe(175);
    expect(calcularSalgados(50).valor).toBe(87.5);
    expect(calcularSalgados(25).valor).toBeCloseTo(43.75, 2);
  });
});

describe("calcularFatias", () => {
  it("R$25 por fatia", () => {
    expect(calcularFatias(1).valor).toBe(25);
    expect(calcularFatias(4).valor).toBe(100);
  });
});

describe("dividirBoloGrande (limite 4kg/forma)", () => {
  it("≤4kg → uma forma só", () => {
    expect(dividirBoloGrande(4)).toEqual([4]);
    expect(dividirBoloGrande(2)).toEqual([2]);
  });

  it("5kg → 4+1", () => {
    expect(dividirBoloGrande(5)).toEqual([4, 1]);
  });

  it("8kg → 4+4", () => {
    expect(dividirBoloGrande(8)).toEqual([4, 4]);
  });

  it("10kg → 4+4+2", () => {
    expect(dividirBoloGrande(10)).toEqual([4, 4, 2]);
  });
});

describe("calcularEntrada", () => {
  it("pedido ≤ R$300 → não precisa entrada", () => {
    const r = calcularEntrada(250);
    expect(r.precisaEntrada).toBe(false);
    expect(r.valorEntrada).toBe(250);
  });

  it("pedido > R$300 → entrada 50%", () => {
    const r = calcularEntrada(400);
    expect(r.precisaEntrada).toBe(true);
    expect(r.valorEntrada).toBe(200);
    expect(r.valorRestante).toBe(200);
  });
});

describe("verificarMinimoDelivery", () => {
  it("R$50 é o mínimo", () => {
    expect(verificarMinimoDelivery(50).atinge).toBe(true);
    expect(verificarMinimoDelivery(49).atinge).toBe(false);
    expect(verificarMinimoDelivery(49).falta).toBe(1);
  });
});
