import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEND_MESSAGE_TIMEOUT_MS = 12000;

function isAllowedEvolutionBaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

async function sendEvolutionMessage(
  baseUrl: string,
  apiKey: string,
  instance: string,
  number: string,
  text: string
): Promise<void> {
  const num = number.replace(/\D/g, "").slice(-15);
  if (!num || num.length < 10 || !text) return;
  if (!isAllowedEvolutionBaseUrl(baseUrl)) throw new Error("Evolution URL inválida");
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_MESSAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({
        number: num,
        text: text.slice(0, 4096),
        delay: 8000,
        textMessage: { text: text.slice(0, 4096) },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Evolution send failed: ${res.status} ${err.slice(0, 150)}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function getEvolutionConfig(settings: { key: string; value: string }[]) {
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const baseUrl = (map.get("evolution_base_url") || "").trim().replace(/\/$/, "");
  const apiKey = (map.get("evolution_api_key") || "").trim();
  let instance = (map.get("evolution_instance") || "default").trim() || "default";
  instance = instance.replace(/\s+/g, "-");
  return { baseUrl, apiKey, instance };
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Obtém operator_id para pedidos criados pelo bot. */
async function getBotOperatorId(supabase: any): Promise<string | null> {
  const { data: settings } = await supabase.from("crm_settings").select("value").eq("key", "bot_operator_id").maybeSingle();
  const uid = (settings as { value?: string } | null)?.value?.trim();
  if (uid) return uid;
  const { data: profile } = await supabase.from("profiles").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return (profile as { id?: string } | null)?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, action } = await req.json();
    if (!id || !["confirmed", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ ok: false, error: "id e action (confirmed|rejected) obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient<any>(supabaseUrl, serviceKey);

    // Buscar o payment_confirmation
    const { data: pc, error: pcErr } = await supabase
      .from("payment_confirmations")
      .select("*")
      .eq("id", id)
      .single();

    if (pcErr || !pc) {
      return new Response(JSON.stringify({ ok: false, error: "comprovante não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pc.status !== "pending") {
      return new Response(JSON.stringify({ ok: false, error: "comprovante já processado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar config do Evolution
    const { data: allSettings } = await supabase.from("crm_settings").select("key, value");
    const evo = getEvolutionConfig(allSettings || []);
    const remoteJid = pc.remote_jid || normalizePhone(pc.customer_phone);

    if (action === "confirmed") {
      // Criar pedido/encomenda a partir do payload salvo
      const payload = pc.order_payload;
      let createdOk = false;

      if (pc.type === "pedido" && payload) {
        const result = await createOrderFromPayload(supabase, payload, pc.customer_phone, pc.customer_name, evo);
        createdOk = result.ok;
        if (!result.ok) console.error("confirm-payment: falha ao criar pedido", result.error);
      } else if (pc.type === "encomenda" && payload) {
        const result = await createEncomendaFromPayload(supabase, payload);
        createdOk = result.ok;
        if (!result.ok) console.error("confirm-payment: falha ao criar encomenda", result.error);
      }

      // Atualizar status
      await supabase.from("payment_confirmations").update({
        status: "confirmed",
        decided_at: new Date().toISOString(),
      }).eq("id", id);

      // Enviar mensagem de confirmação ao cliente
      if (evo.baseUrl && evo.apiKey && remoteJid) {
        const confirmMsg = pc.type === "encomenda"
          ? "Seu comprovante foi verificado e aprovado! ✅ Sua encomenda foi registrada com sucesso. Obrigado! 🎂"
          : "Seu comprovante foi verificado e aprovado! ✅ Seu pedido foi registrado com sucesso. Obrigado! 🎂";
        try {
          await sendEvolutionMessage(evo.baseUrl, evo.apiKey, evo.instance, remoteJid, confirmMsg);
        } catch (e) {
          console.error("confirm-payment: erro ao enviar confirmação", (e as Error).message);
        }
      }

      // Limpar sessão
      await supabase.from("sessions").update({ memory: {} as any, updated_at: new Date().toISOString() } as any).eq("remote_jid", remoteJid);

      return new Response(JSON.stringify({ ok: true, created: createdOk }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rejected") {
      // Atualizar status
      await supabase.from("payment_confirmations").update({
        status: "rejected",
        decided_at: new Date().toISOString(),
      }).eq("id", id);

      // Enviar mensagem de recusa ao cliente
      if (evo.baseUrl && evo.apiKey && remoteJid) {
        const rejectMsg = "Infelizmente esse comprovante não bate com nossos dados, e não irei conseguir agendar o seu pedido! Poderia me mandar o comprovante corretamente? 😊";
        try {
          await sendEvolutionMessage(evo.baseUrl, evo.apiKey, evo.instance, remoteJid, rejectMsg);
        } catch (e) {
          console.error("confirm-payment: erro ao enviar recusa", (e as Error).message);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("confirm-payment error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- Funções de criação de pedido/encomenda (copiadas do webhook, simplificadas) ----

async function createOrderFromPayload(
  supabase: any,
  payload: Record<string, unknown>,
  customerPhone: string,
  customerName: string,
  evo: { baseUrl: string; apiKey: string; instance: string }
): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const operatorId = await getBotOperatorId(supabase);
  if (!operatorId) return { ok: false, error: "operator_id não configurado" };

  const items = (payload.items as { recipe_name?: string; quantity?: number; unit_type?: string; notes?: string }[]) || [];
  if (items.length === 0) return { ok: false, error: "itens vazios" };

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, sale_price, slice_price, whole_price, slice_weight_grams, whole_weight_grams")
    .eq("active", true);

  const recipeMap = new Map<string, any>();
  for (const r of recipes || []) {
    const name = (r as any).name?.trim().toLowerCase();
    if (name) recipeMap.set(name, {
      id: r.id,
      sale_price: Number(r.sale_price) || 0,
      slice_price: r.slice_price != null ? Number(r.slice_price) : null,
      whole_price: r.whole_price != null ? Number(r.whole_price) : null,
      slice_weight_grams: r.slice_weight_grams ?? null,
      whole_weight_grams: r.whole_weight_grams ?? null,
    });
  }

  const orderItems: any[] = [];
  for (const item of items) {
    const name = String(item.recipe_name || "").trim().toLowerCase();
    let recipeEntry = recipeMap.get(name) ?? null;
    if (!recipeEntry && name) {
      for (const [k, v] of recipeMap.entries()) {
        if (k.includes(name) || name.includes(k)) { recipeEntry = v; break; }
      }
    }
    if (!recipeEntry) continue;
    const unitType = (item.unit_type || "slice").toLowerCase() === "whole" ? "whole" : "slice";
    const unitPrice = unitType === "whole" && recipeEntry.whole_price != null ? recipeEntry.whole_price : (recipeEntry.slice_price ?? recipeEntry.sale_price);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    orderItems.push({ recipe_id: recipeEntry.id, quantity: qty, unit_price: unitPrice, unit_type: unitType, notes: item.notes || null });
  }
  if (orderItems.length === 0) return { ok: false, error: "nenhum item válido" };

  const channel = (payload.channel as string) || "cardapio_digital";
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      operator_id: operatorId,
      customer_name: (payload.customer_name as string) || customerName || "Cliente WhatsApp",
      customer_phone: customerPhone || null,
      channel: channel === "delivery" ? "delivery" : channel === "balcao" ? "balcao" : "cardapio_digital",
      status: "aberto",
    } as any)
    .select("id")
    .single();
  if (orderErr || !order) return { ok: false, error: orderErr?.message };

  const orderId = (order as any).id;
  const toInsert = orderItems.map((i: any) => ({
    order_id: orderId,
    recipe_id: i.recipe_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
    unit_type: i.unit_type,
    notes: i.notes,
  }));
  await supabase.from("order_items").insert(toInsert);

  const total = orderItems.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
  const paymentRaw = ((payload.payment_method as string) || "pix").toLowerCase();
  const payment_method = paymentRaw === "credito" || paymentRaw === "crédito" ? "credito" : paymentRaw === "debito" || paymentRaw === "débito" ? "debito" : paymentRaw === "dinheiro" ? "dinheiro" : "pix";

  await supabase.from("sales").insert({
    operator_id: operatorId,
    channel: channel === "delivery" ? "delivery" : "cardapio_digital",
    payment_method: payment_method as any,
    total,
    customer_name: (payload.customer_name as string) || customerName,
    sold_at: new Date().toISOString(),
  } as any);

  // Finalizar pedido
  await supabase.from("orders").update({ status: "finalizado" as any, closed_at: new Date().toISOString() }).eq("id", orderId);

  return { ok: true, orderId };
}

async function createEncomendaFromPayload(
  supabase: any,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; encomendaId?: string; error?: string }> {
  const customer_name = (payload.customer_name as string)?.trim() || "Cliente WhatsApp";
  const product_description = (payload.product_description as string)?.trim() || "Encomenda";
  const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
  const total_value = Math.max(0, Number(payload.total_value) || 0);
  const payment_method = (payload.payment_method as string)?.toLowerCase() === "credito" ? "credito" : "pix";
  const paid_50_percent = !!payload.paid_50_percent;

  const { data: enc, error } = await supabase
    .from("encomendas")
    .insert({
      customer_name,
      customer_phone: (payload.customer_phone as string) || null,
      product_description,
      quantity,
      total_value,
      address: (payload.address as string) || null,
      payment_method,
      paid_50_percent,
      observations: (payload.observations as string) || null,
      delivery_date: (payload.delivery_date as string) || null,
      delivery_time_slot: (payload.delivery_time_slot as string) || null,
      status: paid_50_percent ? "50_pago" : "pendente",
      source: "whatsapp",
    } as any)
    .select("id")
    .single();

  if (error || !enc) return { ok: false, error: error?.message };

  // Registrar venda
  try {
    const operatorId = await getBotOperatorId(supabase);
    if (operatorId && total_value > 0) {
      const depositTotal = paid_50_percent ? total_value / 2 : total_value;
      await supabase.from("sales").insert({
        operator_id: operatorId,
        channel: "balcao",
        payment_method: payment_method as any,
        total: depositTotal,
        customer_name,
        sold_at: new Date().toISOString(),
      } as any);
    }
  } catch (e) {
    console.error("createEncomendaFromPayload sales insert error:", (e as Error).message);
  }

  return { ok: true, encomendaId: (enc as any).id };
}
