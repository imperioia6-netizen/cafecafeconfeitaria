/**
 * orderProcessor.ts — Processamento de pedidos, encomendas e pagamentos.
 * Cria orders/encomendas no banco, registra vendas, dá baixa no estoque,
 * e envia para TicketFlow.
 *
 * SEGURANÇA:
 * - Payloads JSON da IA são validados antes de inserção no banco.
 * - IDs usam Supabase client (sem SQL raw), prevenindo injection.
 * - Valores monetários são validados como números finitos positivos.
 * - Nomes de receitas são matched via normalização (sem eval/regex dinâmico de user input).
 * - Datas de pagamento são validadas contra o dia corrente (anti-replay).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhone } from "./getOwner.ts";
import { sanitizeName, sanitizePhone } from "./security.ts";
import { sendTicketFlowOrder } from "./ticketflow.ts";
import { sendEvolutionMessage } from "./evolutionApi.ts";
import { normalizeForCompare } from "./webhookUtils.ts";

// ── Tipos ──

export interface ParsedBlocks {
  replyClean: string;
  pedidoJson: Record<string, unknown> | null;
  encomendaJson: Record<string, unknown> | null;
  quitarEncomendaJson: Record<string, unknown> | null;
  atualizarClienteJson: Record<string, unknown> | null;
  alertaEquipeText: string | null;
}

export interface OrderResult {
  ok: boolean;
  orderId?: string;
  error?: string;
}

export interface EncomendaResult {
  ok: boolean;
  encomendaId?: string;
  error?: string;
}

// ── Validação de schemas JSON (segurança) ──

/**
 * Valida que o payload de CRIAR_PEDIDO tem a estrutura esperada.
 * Rejeita payloads com campos inesperados ou tipos errados.
 */
function validatePedidoSchema(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  // Campos obrigatórios
  if (typeof o.customer_name !== "string" || typeof o.customer_phone !== "string") return null;
  if (!Array.isArray(o.items) || o.items.length === 0 || o.items.length > 50) return null;
  // Validar cada item
  for (const item of o.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const it = item as Record<string, unknown>;
    if (typeof it.recipe_name !== "string" || !it.recipe_name) return null;
    if (typeof it.quantity !== "number" || it.quantity < 1 || it.quantity > 999 || !Number.isFinite(it.quantity)) return null;
  }
  // Sanitizar campos de string para evitar injection
  return {
    customer_name: String(o.customer_name).slice(0, 200),
    customer_phone: String(o.customer_phone).slice(0, 20),
    channel: typeof o.channel === "string" ? String(o.channel).slice(0, 50) : "whatsapp",
    order_number: typeof o.order_number === "string" ? String(o.order_number).slice(0, 50) : "",
    table_number: typeof o.table_number === "string" ? String(o.table_number).slice(0, 20) : "",
    payment_method: typeof o.payment_method === "string" ? String(o.payment_method).slice(0, 50) : "",
    items: (o.items as Record<string, unknown>[]).map((it) => ({
      recipe_name: String((it as Record<string, unknown>).recipe_name).slice(0, 200),
      quantity: Math.min(Math.max(1, Number((it as Record<string, unknown>).quantity) || 1), 999),
      unit_type: typeof (it as Record<string, unknown>).unit_type === "string" ? String((it as Record<string, unknown>).unit_type).slice(0, 20) : "whole",
      notes: typeof (it as Record<string, unknown>).notes === "string" ? String((it as Record<string, unknown>).notes).slice(0, 500) : "",
    })),
  };
}

/**
 * Valida que o payload de CRIAR_ENCOMENDA tem a estrutura esperada.
 */
function validateEncomendaSchema(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.customer_name !== "string" || typeof o.customer_phone !== "string") return null;
  if (typeof o.total_value !== "number" || !Number.isFinite(o.total_value) || o.total_value <= 0 || o.total_value > 100000) return null;
  return {
    customer_name: String(o.customer_name).slice(0, 200),
    customer_phone: String(o.customer_phone).slice(0, 20),
    product_description: typeof o.product_description === "string" ? String(o.product_description).slice(0, 500) : "",
    quantity: typeof o.quantity === "number" && Number.isFinite(o.quantity) ? Math.min(Math.max(1, o.quantity), 999) : 1,
    total_value: o.total_value,
    address: typeof o.address === "string" ? String(o.address).slice(0, 500) : "",
    payment_method: typeof o.payment_method === "string" ? String(o.payment_method).slice(0, 50) : "",
    paid_50_percent: o.paid_50_percent === true,
    observations: typeof o.observations === "string" ? String(o.observations).slice(0, 1000) : "",
    delivery_date: typeof o.delivery_date === "string" ? String(o.delivery_date).slice(0, 20) : "",
    delivery_time_slot: typeof o.delivery_time_slot === "string" ? String(o.delivery_time_slot).slice(0, 50) : "",
  };
}

/**
 * Valida que o payload de QUITAR_ENCOMENDA tem a estrutura esperada.
 */
function validateQuitarSchema(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.customer_phone !== "string") return null;
  if (typeof o.payment_value !== "number" || !Number.isFinite(o.payment_value) || o.payment_value <= 0 || o.payment_value > 100000) return null;
  return {
    customer_phone: String(o.customer_phone).slice(0, 20),
    payment_value: o.payment_value,
    payment_date: typeof o.payment_date === "string" ? String(o.payment_date).slice(0, 20) : new Date().toISOString().slice(0, 10),
  };
}

/**
 * Valida que o payload de ATUALIZAR_CLIENTE tem a estrutura esperada.
 */
function validateClienteSchema(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.phone !== "string" && typeof o.name !== "string") return null;
  return {
    name: typeof o.name === "string" ? String(o.name).slice(0, 200) : "",
    phone: typeof o.phone === "string" ? String(o.phone).slice(0, 20) : "",
    email: typeof o.email === "string" ? String(o.email).slice(0, 200) : "",
    address: typeof o.address === "string" ? String(o.address).slice(0, 500) : "",
    birthday: typeof o.birthday === "string" ? String(o.birthday).slice(0, 20) : "",
  };
}

// ── Parse de blocos da resposta da IA ──

/**
 * Extrai blocos [CRIAR_PEDIDO], [CRIAR_ENCOMENDA], [QUITAR_ENCOMENDA],
 * [ATUALIZAR_CLIENTE] e [ALERTA_EQUIPE] da resposta da IA.
 *
 * SEGURANÇA:
 * - JSON.parse em try/catch — payloads malformados são ignorados.
 * - Cada payload passa por validação de schema (tipos, limites, sanitização).
 * - Campos de string são truncados para evitar buffer overflow.
 * - Valores numéricos são validados como finitos e dentro de limites razoáveis.
 */
export function parseCreateBlocks(reply: string): ParsedBlocks {
  let replyClean = reply;
  let pedidoJson: Record<string, unknown> | null = null;
  let encomendaJson: Record<string, unknown> | null = null;
  let quitarEncomendaJson: Record<string, unknown> | null = null;
  let atualizarClienteJson: Record<string, unknown> | null = null;
  let alertaEquipeText: string | null = null;

  const pedidoMatch = reply.match(
    /\[CRIAR_PEDIDO\]([\s\S]*?)\[\/CRIAR_PEDIDO\]/i
  );
  if (pedidoMatch) {
    replyClean = replyClean
      .replace(/\s*\[CRIAR_PEDIDO\][\s\S]*?\[\/CRIAR_PEDIDO\]\s*/gi, "")
      .trim();
    try {
      const raw = JSON.parse(pedidoMatch[1].trim());
      pedidoJson = validatePedidoSchema(raw);
      if (!pedidoJson) console.warn("parseCreateBlocks: CRIAR_PEDIDO falhou validação de schema");
    } catch {
      pedidoJson = null;
    }
  }

  const encomendaMatch = reply.match(
    /\[CRIAR_ENCOMENDA\]([\s\S]*?)\[\/CRIAR_ENCOMENDA\]/i
  );
  if (encomendaMatch) {
    replyClean = replyClean
      .replace(/\s*\[CRIAR_ENCOMENDA\][\s\S]*?\[\/CRIAR_ENCOMENDA\]\s*/gi, "")
      .trim();
    try {
      const raw = JSON.parse(encomendaMatch[1].trim());
      encomendaJson = validateEncomendaSchema(raw);
      if (!encomendaJson) console.warn("parseCreateBlocks: CRIAR_ENCOMENDA falhou validação de schema");
    } catch {
      encomendaJson = null;
    }
  }

  const quitarMatch = reply.match(
    /\[QUITAR_ENCOMENDA\]([\s\S]*?)\[\/QUITAR_ENCOMENDA\]/i
  );
  if (quitarMatch) {
    replyClean = replyClean
      .replace(
        /\s*\[QUITAR_ENCOMENDA\][\s\S]*?\[\/QUITAR_ENCOMENDA\]\s*/gi,
        ""
      )
      .trim();
    try {
      const raw = JSON.parse(quitarMatch[1].trim());
      quitarEncomendaJson = validateQuitarSchema(raw);
      if (!quitarEncomendaJson) console.warn("parseCreateBlocks: QUITAR_ENCOMENDA falhou validação de schema");
    } catch {
      quitarEncomendaJson = null;
    }
  }

  const atualizarMatch = reply.match(
    /\[ATUALIZAR_CLIENTE\]([\s\S]*?)\[\/ATUALIZAR_CLIENTE\]/i
  );
  if (atualizarMatch) {
    replyClean = replyClean
      .replace(
        /\s*\[ATUALIZAR_CLIENTE\][\s\S]*?\[\/ATUALIZAR_CLIENTE\]\s*/gi,
        ""
      )
      .trim();
    try {
      const raw = JSON.parse(atualizarMatch[1].trim());
      atualizarClienteJson = validateClienteSchema(raw);
      if (!atualizarClienteJson) console.warn("parseCreateBlocks: ATUALIZAR_CLIENTE falhou validação de schema");
    } catch {
      atualizarClienteJson = null;
    }
  }

  const alertaMatch = reply.match(
    /\[ALERTA_EQUIPE\]([\s\S]*?)\[\/ALERTA_EQUIPE\]/i
  );
  if (alertaMatch) {
    replyClean = replyClean
      .replace(/\s*\[ALERTA_EQUIPE\][\s\S]*?\[\/ALERTA_EQUIPE\]\s*/gi, "")
      .trim();
    alertaEquipeText = (alertaMatch[1].trim() || "").slice(0, 500) || null;
  }

  return {
    replyClean,
    pedidoJson,
    encomendaJson,
    quitarEncomendaJson,
    atualizarClienteJson,
    alertaEquipeText,
  };
}

// ── Helpers internos ──

/**
 * Obtém operator_id para pedidos criados pelo bot.
 */
export async function getBotOperatorId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: settings } = await supabase
    .from("crm_settings")
    .select("value")
    .eq("key", "bot_operator_id")
    .maybeSingle();
  const uid = (settings as { value?: string } | null)?.value?.trim();
  if (uid) return uid;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (profile as { id?: string } | null)?.id ?? null;
}

/**
 * Verifica se o cliente tem pedidos/encomendas REALMENTE pendentes de
 * finalização nas últimas 72h.
 *
 * IMPORTANTE: "em aberto" aqui significa que o pedido AINDA NÃO foi aceito
 * pela equipe (aguardando sinal ou aprovação do comprovante). Encomendas
 * já aceitas ("50_pago" = sinal aprovado, "em_producao", "entregue") NÃO
 * entram — essas são pedidos já fechados, do ponto de vista da conversa.
 * Se o cliente retornar depois de ter um pedido aceito, o atendente
 * cumprimenta normalmente e abre um novo atendimento, sem perguntar "quer
 * continuar com o pedido anterior?".
 */
export async function checkOpenOrders(
  supabase: SupabaseClient,
  customerPhone: string
): Promise<{ hasOpenOrder: boolean; orderSummary: string }> {
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: openOrders } = await supabase
    .from("orders")
    .select(
      "id, status, customer_name, created_at, order_items(quantity, recipes(name))"
    )
    .eq("customer_phone", customerPhone)
    .eq("status", "aberto")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!openOrders || openOrders.length === 0) {
    // Apenas encomendas ainda PENDENTES (sem sinal aprovado) contam como
    // "em aberto". Status como "50_pago" / "em_producao" significam que a
    // equipe já aceitou — pedido em fluxo normal, não precisa perguntar.
    const { data: openEncomendas } = await supabase
      .from("encomendas")
      .select("id, product_description, total_value, status, created_at")
      .eq("customer_phone", customerPhone)
      .eq("status", "pendente")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3);

    if (!openEncomendas || openEncomendas.length === 0) {
      return { hasOpenOrder: false, orderSummary: "" };
    }

    const encomendaItems = openEncomendas
      .map(
        (e: Record<string, unknown>) =>
          `- ${(e.product_description as string) || "Encomenda"} (R$ ${Number(e.total_value || 0).toFixed(2)}) — status: ${e.status}`
      )
      .join("\n");
    return {
      hasOpenOrder: true,
      orderSummary: `Encomendas em aberto:\n${encomendaItems}`,
    };
  }

  const orderItems = openOrders
    .map((o: Record<string, unknown>) => {
      const items = ((o.order_items as Record<string, unknown>[]) || [])
        .map(
          (oi: Record<string, unknown>) =>
            `${oi.quantity}x ${(oi.recipes as { name?: string })?.name || "item"}`
        )
        .join(", ");
      return `- Pedido de ${((o.created_at as string) || "?").slice(0, 10)}: ${items || "itens não detalhados"}`;
    })
    .join("\n");

  return {
    hasOpenOrder: true,
    orderSummary: `Pedidos em aberto:\n${orderItems}`,
  };
}

// ── Criação de pedidos ──

/**
 * Cria pedido + itens + venda na plataforma a partir do JSON emitido pela IA.
 * SEGURANÇA: Valida cada item contra receitas reais do banco (sem injeção de receita fantasma).
 */
export async function createOrderFromPayload(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  customerPhone: string,
  customerName: string,
  evo: { baseUrl: string; apiKey: string; instance: string },
  ownerPhones: string[]
): Promise<OrderResult> {
  const operatorId = await getBotOperatorId(supabase);
  if (!operatorId) {
    console.error(
      "createOrderFromPayload: nenhum operator_id (bot_operator_id ou profile)"
    );
    return { ok: false, error: "operator_id não configurado" };
  }

  const items =
    (payload.items as {
      recipe_name?: string;
      quantity?: number;
      unit_type?: string;
      notes?: string;
    }[]) || [];
  if (items.length === 0) return { ok: false, error: "itens vazios" };

  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      "id, name, sale_price, slice_price, whole_price, slice_weight_grams, whole_weight_grams"
    )
    .eq("active", true);

  const recipeMap = new Map<
    string,
    {
      id: string;
      sale_price: number;
      slice_price: number | null;
      whole_price: number | null;
      slice_weight_grams: number | null;
      whole_weight_grams: number | null;
    }
  >();
  for (const r of (recipes as Record<string, unknown>[]) || []) {
    // Normaliza sem acentos/espaços extras para matching robusto com o que a IA devolve.
    const name = normalizeForCompare(((r.name as string) || ""));
    if (name)
      recipeMap.set(name, {
        id: r.id as string,
        sale_price: Number(r.sale_price) || 0,
        slice_price:
          r.slice_price != null ? Number(r.slice_price) : null,
        whole_price:
          r.whole_price != null ? Number(r.whole_price) : null,
        slice_weight_grams: (r.slice_weight_grams as number | null) ?? null,
        whole_weight_grams: (r.whole_weight_grams as number | null) ?? null,
      });
  }

  const orderItems: {
    recipe_id: string;
    quantity: number;
    unit_price: number;
    unit_type: string;
    notes: string | null;
  }[] = [];

  for (const item of items) {
    const name = normalizeForCompare(String(item.recipe_name || ""));
    let recipeEntry = recipeMap.get(name) ?? null;
    // Fuzzy match: parcial nos dois sentidos (já normalizado).
    if (!recipeEntry && name) {
      for (const [k, v] of recipeMap.entries()) {
        if (k.includes(name) || name.includes(k)) {
          recipeEntry = v;
          break;
        }
      }
    }
    if (!recipeEntry) {
      console.warn(
        "createOrderFromPayload: recipe_name inválido ignorado:",
        item.recipe_name
      );
      continue;
    }

    const unitType =
      (item.unit_type || "slice").toLowerCase() === "whole" ? "whole" : "slice";
    const unitPrice =
      unitType === "whole" && recipeEntry.whole_price != null
        ? recipeEntry.whole_price
        : (recipeEntry.slice_price ?? recipeEntry.sale_price);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

    orderItems.push({
      recipe_id: recipeEntry.id,
      quantity: qty,
      unit_price: unitPrice,
      unit_type: unitType,
      notes: (item.notes && String(item.notes).trim().slice(0, 500)) || null,
    });
  }

  if (orderItems.length === 0) return { ok: false, error: "nenhum item válido" };

  const channel = (payload.channel as string) || "cardapio_digital";

  // Resolver delivery_zone_id
  let deliveryZoneId: string | null = null;
  const bairroPayload = ((payload.bairro as string) || "").trim();
  if (bairroPayload && channel === "delivery") {
    const { data: zoneMatch } = await supabase
      .from("delivery_zones")
      .select("id")
      .ilike("bairro", bairroPayload)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    deliveryZoneId =
      (zoneMatch as { id?: string } | null)?.id ?? null;
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      operator_id: operatorId,
      order_number: (payload.order_number as string) || null,
      table_number: (payload.table_number as string) || null,
      customer_name:
        (payload.customer_name as string) ||
        customerName ||
        "Cliente WhatsApp",
      customer_phone: customerPhone || null,
      channel:
        channel === "delivery"
          ? "delivery"
          : channel === "balcao"
            ? "balcao"
            : "cardapio_digital",
      status: "aberto",
      delivery_status: channel === "delivery" ? "recebido" : null,
      delivery_zone_id: deliveryZoneId,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("createOrderFromPayload order insert:", orderErr);
    return { ok: false, error: (orderErr as Error)?.message };
  }

  const orderId = (order as { id: string }).id;

  // Vincular cada item a um lote de estoque (inventory)
  const orderItemsWithInventory: {
    recipe_id: string;
    quantity: number;
    unit_price: number;
    unit_type: string;
    notes: string | null;
    inventory_id: string | null;
  }[] = [];

  for (const i of orderItems) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("id")
      .eq("recipe_id", i.recipe_id)
      .gt("stock_grams", 0)
      .order("produced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    orderItemsWithInventory.push({
      ...i,
      inventory_id: (inv as { id?: string } | null)?.id ?? null,
    });
  }

  const toInsert = orderItemsWithInventory.map((i) => ({
    order_id: orderId,
    recipe_id: i.recipe_id,
    inventory_id: i.inventory_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
    unit_type: i.unit_type,
    notes: i.notes,
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(toInsert as Record<string, unknown>[]);
  if (itemsErr) {
    console.error("createOrderFromPayload order_items insert:", itemsErr);
    return { ok: false, error: (itemsErr as Error)?.message };
  }

  const total = orderItemsWithInventory.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0
  );
  const paymentRaw = (
    (payload.payment_method as string) || "pix"
  ).toLowerCase();
  const payment_method =
    paymentRaw === "credito" || paymentRaw === "crédito"
      ? "credito"
      : paymentRaw === "debito" || paymentRaw === "débito"
        ? "debito"
        : paymentRaw === "dinheiro"
          ? "dinheiro"
          : paymentRaw === "refeicao" || paymentRaw === "refeição"
            ? "refeicao"
            : "pix";

  // Registrar venda
  const soldAt = new Date().toISOString();
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      operator_id: operatorId,
      channel:
        channel === "delivery"
          ? "delivery"
          : channel === "balcao"
            ? "balcao"
            : "cardapio_digital",
      payment_method: payment_method as string,
      total,
      order_number: (payload.order_number as string) || null,
      table_number: (payload.table_number as string) || null,
      customer_name:
        (payload.customer_name as string) ||
        customerName ||
        "Cliente WhatsApp",
      customer_id: null,
      sold_at: soldAt,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (saleErr || !sale) {
    console.error("createOrderFromPayload sale insert:", saleErr);
    return { ok: false, error: (saleErr as Error)?.message };
  }

  const saleId = (sale as { id: string }).id;

  const saleItems = orderItemsWithInventory.map((i) => ({
    sale_id: saleId,
    recipe_id: i.recipe_id,
    inventory_id: i.inventory_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
    unit_type: i.unit_type,
  }));

  const { error: siErr } = await supabase
    .from("sale_items")
    .insert(saleItems as Record<string, unknown>[]);
  if (siErr) {
    console.error("createOrderFromPayload sale_items insert:", siErr);
    return { ok: false, error: (siErr as Error)?.message };
  }

  // TicketFlow (sem bloquear)
  try {
    const itemsForTicket = orderItemsWithInventory.map((i) => {
      const recipe = ((recipes as Record<string, unknown>[]) || []).find(
        (r) => (r as { id: string }).id === i.recipe_id
      ) as { name?: string } | undefined;
      return {
        name: (recipe?.name || "produto").toString(),
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
      };
    });
    await sendTicketFlowOrder(supabase, customerPhone, {
      type: "pedido",
      external_id: orderId,
      channel:
        channel === "delivery"
          ? "delivery"
          : channel === "balcao"
            ? "retirada"
            : "cardapio_digital",
      total,
      payment_method,
      items: itemsForTicket,
    } as Record<string, unknown>);
  } catch (e) {
    console.error(
      "createOrderFromPayload ticketflow error:",
      (e as Error).message
    );
  }

  // Baixa no estoque + alerta de estoque baixo
  for (const i of orderItemsWithInventory) {
    if (!i.inventory_id) continue;
    const recipeEntry = [...recipeMap.values()].find(
      (r) => r.id === i.recipe_id
    );
    if (!recipeEntry) continue;

    const unitWeight =
      i.unit_type === "whole"
        ? Number(recipeEntry.whole_weight_grams) || 0
        : Number(recipeEntry.slice_weight_grams) || 0;
    const weightToDeduct = unitWeight * i.quantity;

    const { data: inv } = await supabase
      .from("inventory")
      .select("stock_grams, slices_available")
      .eq("id", i.inventory_id)
      .maybeSingle();
    if (!inv) continue;

    const invData = inv as {
      stock_grams?: number | null;
      slices_available: number;
    };
    const currentGrams = Number(invData.stock_grams ?? 0);
    const currentSlices = Number(invData.slices_available ?? 0);
    const newGrams = Math.max(0, currentGrams - weightToDeduct);
    const newSlices = Math.max(0, currentSlices - i.quantity);

    await supabase
      .from("inventory")
      .update({
        stock_grams: newGrams,
        slices_available: newSlices,
      } as Record<string, unknown>)
      .eq("id", i.inventory_id);

    // Alerta de estoque baixo para donos
    if (
      ownerPhones.length > 0 &&
      newSlices <= 3 &&
      currentSlices > newSlices
    ) {
      const recipeNameKey =
        [...recipeMap.entries()].find(
          ([, v]) => v.id === i.recipe_id
        )?.[0] ?? "";
      const recipeName =
        ((recipes as Record<string, unknown>[]) || []).find(
          (r) => (r as { id: string }).id === i.recipe_id
        )?.name || recipeNameKey || "produto";
      const alertText = `Alerta de estoque: o produto "${recipeName}" está acabando. Restam aproximadamente ${newSlices} fatia(s).`;

      for (const ownerPhone of ownerPhones) {
        try {
          await sendEvolutionMessage(
            evo.baseUrl,
            evo.apiKey,
            evo.instance,
            ownerPhone,
            alertText
          );
        } catch (e) {
          console.error("low-stock alert send error:", (e as Error).message);
        }
      }
    }
  }

  // Fechar pedido (pagamento confirmado no WhatsApp)
  const { error: closeErr } = await supabase
    .from("orders")
    .update({
      status: "finalizado" as string,
      closed_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (closeErr) {
    console.error("createOrderFromPayload close order error:", closeErr);
  }

  return { ok: true, orderId };
}

// ── Criação de encomendas ──

/**
 * Cria encomenda a partir do JSON da IA.
 */
export async function createEncomendaFromPayload(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<EncomendaResult> {
  const customer_name =
    ((payload.customer_name as string) || "").trim() || "Cliente WhatsApp";
  const product_description =
    ((payload.product_description as string) || "").trim() || "Encomenda";
  const quantity = Math.max(
    1,
    Math.floor(Number(payload.quantity) || 1)
  );
  const total_value = Math.max(0, Number(payload.total_value) || 0);
  const payment_method =
    ((payload.payment_method as string) || "").toLowerCase() === "credito"
      ? "credito"
      : "pix";
  const paid_50_percent = !!payload.paid_50_percent;

  // Resolver delivery_zone_id
  let encZoneId: string | null = null;
  const encAddress = ((payload.address as string) || "").trim();
  if (encAddress) {
    const { data: zones } = await supabase
      .from("delivery_zones")
      .select("id, bairro")
      .eq("ativo", true);
    if (zones) {
      const addrLower = encAddress.toLowerCase();
      const match = (zones as { id: string; bairro: string }[]).find(
        (z) => addrLower.includes(z.bairro.toLowerCase())
      );
      encZoneId = match?.id ?? null;
    }
  }

  const { data: enc, error } = await supabase
    .from("encomendas")
    .insert({
      customer_name,
      customer_phone: (payload.customer_phone as string) || null,
      product_description,
      quantity,
      total_value,
      address: encAddress || null,
      payment_method,
      paid_50_percent,
      observations: (payload.observations as string) || null,
      delivery_date: (payload.delivery_date as string) || null,
      delivery_time_slot: (payload.delivery_time_slot as string) || null,
      status: paid_50_percent ? "50_pago" : "pendente",
      source: "whatsapp",
      delivery_zone_id: encZoneId,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !enc) {
    console.error("createEncomendaFromPayload:", error);
    return { ok: false, error: (error as Error)?.message };
  }

  // Registrar faturamento
  try {
    const operatorId = await getBotOperatorId(supabase);
    if (operatorId && total_value > 0) {
      const depositTotal = paid_50_percent ? total_value / 2 : total_value;
      await supabase.from("sales").insert({
        operator_id: operatorId,
        channel: "balcao",
        payment_method: payment_method as string,
        total: depositTotal,
        order_number: null,
        table_number: null,
        customer_name,
        customer_id: null,
        sold_at: new Date().toISOString(),
      } as Record<string, unknown>);
    }
  } catch (e) {
    console.error(
      "createEncomendaFromPayload sales insert error:",
      (e as Error).message
    );
  }

  // TicketFlow
  try {
    await sendTicketFlowOrder(
      supabase,
      (payload.customer_phone as string) || "",
      {
        type: "encomenda",
        external_id: (enc as { id: string }).id,
        channel: "encomenda",
        total: total_value,
        payment_method,
        items: [
          {
            name: product_description,
            quantity,
            unit_price: total_value / quantity,
            subtotal: total_value,
          },
        ],
      } as Record<string, unknown>
    );
  } catch (e) {
    console.error(
      "createEncomendaFromPayload ticketflow error:",
      (e as Error).message
    );
  }

  return { ok: true, encomendaId: (enc as { id: string }).id };
}

// ── Quitação de encomendas ──

/**
 * Quita o restante de uma encomenda (outros 50%).
 * SEGURANÇA:
 * - Valida data de pagamento contra dia corrente (anti-replay).
 * - Valida diferença de valor (até 20% de tolerância para arredondamentos).
 */
export async function settleEncomendaFromPayload(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  customerPhone: string
): Promise<EncomendaResult> {
  const normalizedPhone = sanitizePhone(
    (payload.customer_phone as string) || customerPhone
  );
  const paymentValue = Number(payload.payment_value ?? 0);
  const paymentDateRaw = (
    (payload.payment_date as string) || ""
  ).trim();

  if (!normalizedPhone || paymentValue <= 0 || !paymentDateRaw) {
    return { ok: false, error: "dados insuficientes para quitar encomenda" };
  }

  // Segurança: só aceita pagamento do dia corrente
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (paymentDateRaw !== todayStr) {
    console.warn(
      "settleEncomendaFromPayload: payment_date diferente de hoje",
      paymentDateRaw,
      todayStr
    );
    return { ok: false, error: "data do comprovante não é de hoje" };
  }

  const { data: encomendas } = await supabase
    .from("encomendas")
    .select("id, customer_phone, total_value, paid_50_percent, status")
    .eq("customer_phone", normalizedPhone)
    .eq("paid_50_percent", true)
    .neq("status", "cancelado")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!encomendas || encomendas.length === 0) {
    return {
      ok: false,
      error: "nenhuma encomenda pendente encontrada para esse telefone",
    };
  }

  let target = encomendas[0] as {
    id: string;
    total_value: number;
    paid_50_percent: boolean;
    status: string;
  };
  const candidates = encomendas as typeof target[];

  const match = candidates.find((e) => {
    const total = Number(e.total_value || 0);
    if (!total || total <= 0) return false;
    const expectedRest = total / 2;
    return Math.abs(expectedRest - paymentValue) <= 1;
  });
  if (match) target = match;

  const total = Number(target.total_value || 0);
  const expectedRest = total > 0 ? total / 2 : paymentValue;

  if (expectedRest > 0) {
    const diffPerc =
      Math.abs(paymentValue - expectedRest) / expectedRest;
    if (diffPerc > 0.2) {
      console.warn(
        "settleEncomendaFromPayload: valor não confere",
        { paymentValue, expectedRest }
      );
      return { ok: false, error: "valor não confere com o restante esperado" };
    }
  }

  const { error: updErr } = await supabase
    .from("encomendas")
    .update({ status: "entregue" as string })
    .eq("id", target.id);
  if (updErr) {
    console.error(
      "settleEncomendaFromPayload update encomenda error:",
      updErr
    );
    return { ok: false, error: (updErr as Error)?.message };
  }

  // Registrar restante em sales
  try {
    const operatorId = await getBotOperatorId(supabase);
    if (operatorId && paymentValue > 0) {
      await supabase.from("sales").insert({
        operator_id: operatorId,
        channel: "balcao",
        payment_method: "pix",
        total: paymentValue,
        order_number: null,
        table_number: null,
        customer_name: null,
        customer_id: null,
        sold_at: new Date().toISOString(),
      } as Record<string, unknown>);
    }
  } catch (e) {
    console.error(
      "settleEncomendaFromPayload sales insert error:",
      (e as Error).message
    );
  }

  return { ok: true, encomendaId: target.id };
}

/**
 * Processa bloco [ATUALIZAR_CLIENTE] — atualiza dados cadastrais do cliente.
 */
export async function processClientUpdate(
  supabase: SupabaseClient,
  atualizarJson: Record<string, unknown>,
  normalizedPhone: string,
  pushName: string
): Promise<void> {
  const phoneVal =
    typeof atualizarJson.phone === "string"
      ? normalizePhone(atualizarJson.phone)
      : normalizedPhone;

  const parseBirthday = (v: unknown): string | null => {
    if (typeof v !== "string" || !v.trim()) return null;
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const ddmmyy =
      s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/) ||
      s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (ddmmyy) {
      const day = ddmmyy[1].padStart(2, "0");
      const month = ddmmyy[2].padStart(2, "0");
      const year =
        ddmmyy[3].length === 4 ? ddmmyy[3] : "20" + ddmmyy[3];
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const birthdayVal = parseBirthday(atualizarJson.birthday);

  const buildUpdates = (): Record<string, string> => {
    const updates: Record<string, string> = {};
    if (
      typeof atualizarJson.name === "string" &&
      atualizarJson.name.trim()
    )
      updates.name = sanitizeName(atualizarJson.name.trim());
    if (
      typeof atualizarJson.email === "string" &&
      atualizarJson.email.trim()
    )
      updates.email = atualizarJson.email.trim().slice(0, 255);
    if (
      typeof atualizarJson.address === "string" &&
      atualizarJson.address.trim()
    )
      updates.address = atualizarJson.address.trim().slice(0, 500);
    if (birthdayVal) updates.birthday = birthdayVal;
    return updates;
  };

  const { data: cust } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phoneVal)
    .limit(1)
    .maybeSingle();

  if (cust?.id) {
    const updates = buildUpdates();
    if (Object.keys(updates).length > 0) {
      await supabase.from("customers").update(updates).eq("id", cust.id);
      console.log(
        "evolution-webhook: cliente atualizado (cadastro)",
        cust.id
      );
    }
  } else {
    // Criar e depois atualizar
    const { findOrCreateCustomer } = await import("./customerManager.ts");
    const name =
      typeof atualizarJson.name === "string"
        ? sanitizeName(atualizarJson.name.trim()) || "Cliente"
        : pushName || "Cliente";
    await findOrCreateCustomer(supabase, phoneVal, name);

    const { data: cust2 } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizePhone(phoneVal))
      .limit(1)
      .maybeSingle();
    if (cust2?.id) {
      const updates = buildUpdates();
      if (Object.keys(updates).length > 0) {
        await supabase
          .from("customers")
          .update(updates)
          .eq("id", cust2.id);
        console.log(
          "evolution-webhook: cliente criado/atualizado (cadastro)",
          cust2.id
        );
      }
    }
  }
}
