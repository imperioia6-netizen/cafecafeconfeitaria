import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOwner, parseOwnerPhonesList, normalizePhone } from "../_shared/getOwner.ts";
import { isAllowedEvolutionBaseUrl } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_KEYS = ["evolution_base_url", "evolution_api_key", "evolution_instance"] as const;
const SEND_MESSAGE_TIMEOUT_MS = 12000;

async function sendEvolutionMessage(
  baseUrl: string,
  apiKey: string,
  instance: string,
  number: string,
  text: string
): Promise<void> {
  const num = number.replace(/\D/g, "").slice(-15);
  if (!num || num.length < 10 || !text) return;
  if (!isAllowedEvolutionBaseUrl(baseUrl)) return;
  const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instance)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_MESSAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: num,
        text: text.slice(0, 4096),
        delay: 8000,
        textMessage: { text: text.slice(0, 4096) },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("stock-audit Evolution send failed:", res.status, err.slice(0, 150));
    }
  } catch (e) {
    console.error("stock-audit Evolution send error:", (e as Error).message);
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Busca receitas ativas e o estoque atual (somando stock_grams dos lotes)
    const { data: rows, error } = await supabase
      .from("recipes")
      .select("id, name, min_stock, active, inventory:inventory(stock_grams)")
      .eq("active", true);

    if (error) throw error;

    type RecipeRow = {
      id: string;
      name: string;
      min_stock: number | null;
      active: boolean;
      inventory: { stock_grams: number | null }[] | null;
    };

    const recipes = (rows || []) as RecipeRow[];

    // Carrega configuração do Evolution e números dos donos uma vez
    const { data: evoSettings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", [...EVOLUTION_KEYS]);
    const evoMap = new Map((evoSettings || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const baseUrl = (evoMap.get("evolution_base_url") || "").trim().replace(/\/$/, "");
    const apiKey = (evoMap.get("evolution_api_key") || "").trim();
    let instance = (evoMap.get("evolution_instance") || "default").trim() || "default";
    instance = instance.replace(/\s+/g, "-");

    const owner = await getOwner(supabase);
    const { data: ownerSettingsRows } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["owner_phones", "owner_phone_override"]);
    const ownerPhonesMap = new Map((ownerSettingsRows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const combined = [ownerPhonesMap.get("owner_phones"), ownerPhonesMap.get("owner_phone_override")].filter(Boolean).join("\n");
    let ownerPhonesList = parseOwnerPhonesList(combined);
    if (owner?.ownerPhone) {
      const n = normalizePhone(owner.ownerPhone);
      if (n.length >= 10 && !ownerPhonesList.includes(n)) ownerPhonesList = [...ownerPhonesList, n];
    }

    for (const r of recipes) {
      const invList = r.inventory || [];
      const stockTotal = invList.reduce(
        (s, inv) => s + (Number(inv.stock_grams ?? 0) || 0),
        0
      );
      const minStock = Number(r.min_stock ?? 0);

      const isLow = minStock > 0 && stockTotal <= minStock;

      // Procura se já existe alerta aberto para este recipe_id
      const { data: existing } = await supabase
        .from("alerts")
        .select("id, resolved")
        .eq("recipe_id", r.id)
        .eq("alert_type", "estoque_baixo")
        .eq("resolved", false)
        .maybeSingle();

      if (isLow) {
        // Cria alerta se ainda não existir
        if (!existing) {
          const message =
            stockTotal <= 0
              ? `Produto "${r.name}" está sem estoque.`
              : `Produto "${r.name}" com estoque baixo (${stockTotal.toFixed(0)}g).`;
          await supabase.from("alerts").insert({
            alert_type: "estoque_baixo",
            recipe_id: r.id,
            inventory_id: null,
            message,
            resolved: false,
          } as any);

          // Se Evolution e números de dono estiverem configurados, avisa no WhatsApp
          if (baseUrl && apiKey && ownerPhonesList.length > 0) {
            const text =
              stockTotal <= 0
                ? `Alerta de estoque: o produto "${r.name}" está sem estoque cadastrado.`
                : `Alerta de estoque: o produto "${r.name}" está com estoque baixo (${stockTotal.toFixed(
                    0
                  )}g).`;
            for (const phone of ownerPhonesList) {
              await sendEvolutionMessage(baseUrl, apiKey, instance, phone, text);
            }
          }
        }
      } else if (existing) {
        // Se não está mais baixo, marca alerta como resolvido
        await supabase
          .from("alerts")
          .update({ resolved: true, resolved_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, recipes: recipes.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-audit error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

