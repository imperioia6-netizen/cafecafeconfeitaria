/**
 * v243 — resumo incompleto COM total/PIX: substituir, não só anexar aviso.
 *
 * Screenshot real mostrou: LLM enviou resumo SEM o bolo, calculou Total
 * R$591,25 e Sinal 50% R$295,63, mandou chave PIX... e DEPOIS anexou
 * "⚠️ Opa, parece que esqueci de listar bolo no resumo". Mas o total/PIX
 * estavam errados e o cliente já recebeu a cobrança indevida.
 *
 * Fix: quando há item faltando E a resposta tem total/PIX/sinal, SUBSTITUI
 * a resposta inteira por uma mensagem que admite o erro e pede confirmação
 * SEM envio de cálculo financeiro. Se faltou item mas sem cálculo, só anexa
 * nota (comportamento antigo, menos grave).
 */
import { describe, it, expect } from "vitest";
import { enforceOrderSummaryCompleteness } from "../../../supabase/functions/_shared/conversationMemory.ts";

type H = { role: "user" | "assistant"; content: string };

const HIST_BOLO_SALGADOS_DOCES: H[] = [
  { role: "user", content: "quero um bolo de morango 3kg" },
  { role: "user", content: "e 25 mini coxinhas" },
  { role: "user", content: "e 25 mini empadas de frango" },
  { role: "user", content: "e 50 brigadeiros" },
];

describe("v243 — resumo com PIX/total sem o bolo → substitui resposta", () => {
  it("caso real da screenshot: esqueceu bolo + mandou PIX → substitui sem PIX", () => {
    const resp = `• 25 mini empadas de frango: R$47,50
• 25 mini coxinhas: R$43,75
• 50 brigadeiros (docinho): R$95,00

Total: R$591,25

Para esse pedido pedimos sinal de 50%: R$295,63. Chave PIX: 11998287836 (Nubank, Sandra Regina). Quando fizer, me manda o comprovante!`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_BOLO_SALGADOS_DOCES);

    // PIX / chave / valor do sinal NÃO podem estar na resposta
    expect(out).not.toContain("11998287836");
    expect(out).not.toContain("R$591");
    expect(out).not.toContain("R$295");
    expect(out).not.toContain("Nubank");
    expect(out.toLowerCase()).not.toContain("chave pix");
    expect(out.toLowerCase()).not.toContain("sinal de 50");

    // Deve pedir confirmação dos itens
    expect(out.toLowerCase()).toMatch(/bolo/);
    expect(out.toLowerCase()).toMatch(/confirmar|conferir/);
  });

  it("esqueceu bolo + mandou só Total (sem PIX) → substitui", () => {
    const resp = `Anotado!
- 25 mini coxinhas: R$43,75
- 50 brigadeiros: R$95,00

Total: R$138,75`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_BOLO_SALGADOS_DOCES);
    expect(out).not.toContain("R$138");
    expect(out.toLowerCase()).toMatch(/bolo/);
    expect(out.toLowerCase()).toMatch(/confirmar|conferir/);
  });

  it("esqueceu bolo + mencionou sinal 50% + R$ → substitui", () => {
    const resp = `Resumo: 25 coxinhas R$43,75 e 50 brigadeiros R$95,00. Sinal de 50% pra fechar: R$69,37.`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_BOLO_SALGADOS_DOCES);
    expect(out).not.toContain("50%");
    expect(out).not.toContain("R$69");
    expect(out.toLowerCase()).toMatch(/confirmar|conferir/);
  });

  it("resumo incompleto SEM cálculo financeiro → só anexa aviso (comportamento antigo)", () => {
    // Sem R$, sem PIX, sem total — cliente pode avaliar sem perigo financeiro
    const resp = `Resumo do seu pedido:
- 25 mini coxinhas
- 50 brigadeiros`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_BOLO_SALGADOS_DOCES);
    // Preserva o resumo original
    expect(out).toContain("25 mini coxinhas");
    expect(out).toContain("50 brigadeiros");
    // Anexa aviso
    expect(out.toLowerCase()).toMatch(/esqueci|conferir/);
  });

  it("resumo completo (bolo + salgados + docinhos) → passa intacto", () => {
    // Inclui TODOS os itens do histórico: bolo, salgados, docinhos
    const resp = `Anotado!
- Bolo de Morango 3kg: R$345,00
- 25 mini coxinhas: R$43,75
- 25 mini empadas de frango: R$47,50
- 50 brigadeiros: R$95,00

Total: R$531,25`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_BOLO_SALGADOS_DOCES);
    expect(out).toBe(resp);
  });

  it("sem pedido no histórico → passa intacto mesmo com PIX", () => {
    const resp = `Bolo Morango 2kg: R$230. Total: R$230. PIX: 11998287836`;
    const out = enforceOrderSummaryCompleteness(resp, []);
    expect(out).toBe(resp);
  });

  it("2+ valores R$ na resposta sem total explícito → ainda considera financial", () => {
    const resp = `• 25 coxinhas R$43,75
• 50 brigadeiros R$95,00
Então fica R$138,75`;
    const out = enforceOrderSummaryCompleteness(resp, HIST_BOLO_SALGADOS_DOCES);
    // Tem 3 valores R$, "fica R$138,75" simula total → substitui
    expect(out.toLowerCase()).toMatch(/confirmar|conferir/);
  });
});
