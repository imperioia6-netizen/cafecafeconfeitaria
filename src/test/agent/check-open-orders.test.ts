/**
 * Regressão: quando o cliente manda "oii" depois de um pedido JÁ ACEITO pela
 * equipe (status "50_pago" / "em_producao" / "entregue"), o agente perguntava
 * "quer continuar o pedido anterior?" — errado. Só deve perguntar quando o
 * pedido está realmente PENDENTE de finalização (status "pendente").
 */
import { describe, it, expect, vi } from "vitest";
import { checkOpenOrders } from "../../../supabase/functions/_shared/orderProcessor.ts";

// Stub do cliente Supabase que APLICA os filtros de verdade.
function makeSupabaseStub(
  ordersData: Array<Record<string, unknown>>,
  encomendasData: Array<Record<string, unknown>>,
  captureQuery?: (table: string, filters: Record<string, unknown>) => void
) {
  const buildQuery = (table: string) => {
    const filters: Record<string, unknown> = { table };
    let rows = (table === "orders" ? ordersData : encomendasData).slice();
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = (col: string, val: unknown) => {
      filters[`eq:${col}`] = val;
      rows = rows.filter((r) => r[col] === val);
      return chain;
    };
    chain.in = (col: string, vals: unknown[]) => {
      filters[`in:${col}`] = vals;
      rows = rows.filter((r) => vals.includes(r[col] as unknown));
      return chain;
    };
    chain.gte = (col: string, val: unknown) => {
      filters[`gte:${col}`] = val;
      rows = rows.filter((r) => String(r[col]) >= String(val));
      return chain;
    };
    chain.order = () => chain;
    chain.limit = (_n: number) => {
      captureQuery?.(table, filters);
      return Promise.resolve({ data: rows, error: null });
    };
    return chain;
  };
  return {
    from: (table: string) => buildQuery(table),
  } as unknown as Parameters<typeof checkOpenOrders>[0];
}

describe("checkOpenOrders — só pergunta quando há pedido PENDENTE", () => {
  it("encomenda em status 'pendente' (aguardando sinal) → retorna aberto", async () => {
    const sb = makeSupabaseStub(
      [],
      [
        {
          id: "enc1",
          customer_phone: "553599940663",
          product_description: "Bolo trufado 2kg",
          total_value: 258,
          status: "pendente",
          created_at: "2026-04-22T10:00:00Z",
        },
      ]
    );
    const r = await checkOpenOrders(sb, "553599940663");
    expect(r.hasOpenOrder).toBe(true);
    expect(r.orderSummary).toMatch(/Encomendas em aberto/);
    expect(r.orderSummary).toMatch(/Bolo trufado/);
  });

  it("encomenda em status '50_pago' (sinal aprovado pela equipe) → NÃO perguntar", async () => {
    const sb = makeSupabaseStub(
      [],
      [
        {
          id: "enc1",
          customer_phone: "553599940663",
          product_description: "Bolo trufado 2kg",
          total_value: 258,
          status: "50_pago",
          created_at: "2026-04-22T10:00:00Z",
        },
      ]
    );
    const r = await checkOpenOrders(sb, "553599940663");
    // 50_pago = equipe aceitou; não é pedido "em aberto" do ponto de vista
    // do atendimento, pois não exige ação do cliente para finalizar.
    expect(r.hasOpenOrder).toBe(false);
    expect(r.orderSummary).toBe("");
  });

  it("encomenda em 'em_producao' → NÃO perguntar", async () => {
    const sb = makeSupabaseStub(
      [],
      [
        {
          id: "enc1",
          customer_phone: "123",
          product_description: "x",
          total_value: 100,
          status: "em_producao",
          created_at: "2026-04-22T10:00:00Z",
        },
      ]
    );
    const r = await checkOpenOrders(sb, "123");
    expect(r.hasOpenOrder).toBe(false);
  });

  it("encomenda em 'entregue' → NÃO perguntar", async () => {
    const sb = makeSupabaseStub(
      [],
      [
        {
          id: "enc1",
          customer_phone: "123",
          product_description: "x",
          total_value: 100,
          status: "entregue",
          created_at: "2026-04-22T10:00:00Z",
        },
      ]
    );
    const r = await checkOpenOrders(sb, "123");
    expect(r.hasOpenOrder).toBe(false);
  });

  it("sem encomendas nem pedidos → NÃO perguntar", async () => {
    const sb = makeSupabaseStub([], []);
    const r = await checkOpenOrders(sb, "123");
    expect(r.hasOpenOrder).toBe(false);
  });

  it("order em status 'aberto' → perguntar", async () => {
    const sb = makeSupabaseStub(
      [
        {
          id: "o1",
          customer_phone: "123",
          status: "aberto",
          customer_name: "Vitor",
          created_at: "2026-04-22T10:00:00Z",
          order_items: [
            { quantity: 25, recipes: { name: "mini coxinha" } },
          ],
        },
      ],
      []
    );
    const r = await checkOpenOrders(sb, "123");
    expect(r.hasOpenOrder).toBe(true);
    expect(r.orderSummary).toMatch(/Pedidos em aberto/);
    expect(r.orderSummary).toMatch(/mini coxinha/);
  });

  it("query de encomendas usa eq status='pendente' (não in com outros)", async () => {
    let captured: { table: string; filters: Record<string, unknown> } | null = null;
    const sb = makeSupabaseStub([], [], (table, filters) => {
      if (table === "encomendas") captured = { table, filters };
    });
    await checkOpenOrders(sb, "123");
    expect(captured).not.toBeNull();
    expect(captured!.filters["eq:status"]).toBe("pendente");
    expect(captured!.filters["in:status"]).toBeUndefined();
  });
});
