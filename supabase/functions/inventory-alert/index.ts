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
      console.error("inventory-alert Evolution send failed:", res.status, err.slice(0, 150));
    }
  } catch (e) {
    console.error("inventory-alert Evolution send error:", (e as Error).message);
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
    const body = (await req.json().catch(() => ({}))) as { inventory_ids?: string[] };
    const ids = Array.isArray(body.inventory_ids) ? body.inventory_ids.filter((x) => typeof x === "string") : [];
    if (!ids.length) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_ids" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: evoSettings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", [...EVOLUTION_KEYS]);
    const evoMap = new Map((evoSettings || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const baseUrl = (evoMap.get("evolution_base_url") || "").trim().replace(/\/$/, "");
    const apiKey = (evoMap.get("evolution_api_key") || "").trim();
    let instance = (evoMap.get("evolution_instance") || "default").trim() || "default";
    instance = instance.replace(/\s+/g, "-");
    if (!baseUrl || !apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Evolution not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    if (!ownerPhonesList.length) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_owner_phones" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inventoryRows } = await supabase
      .from("inventory")
      .select("id, slices_available, stock_grams, recipes(name, slice_weight_grams, sells_slice)")
      .in("id", ids);

    for (const row of inventoryRows || []) {
      const inv = row as {
        id: string;
        slices_available: number;
        stock_grams: number | null;
        recipes: { name: string; slice_weight_grams: number | null; sells_slice?: boolean } | null;
      };
      const recipeName = inv.recipes?.name || "produto";
      const sliceWeight = Number(inv.recipes?.slice_weight_grams ?? 0);
      let slices = Number(inv.slices_available ?? 0);
      if ((!slices || slices <= 0) && sliceWeight > 0) {
        const grams = Number(inv.stock_grams ?? 0);
        slices = grams > 0 ? Math.floor(grams / sliceWeight) : 0;
      }

      if (slices <= 3) {
        const text = `Alerta de estoque: o produto \"${recipeName}\" está acabando. Restam aproximadamente ${slices} fatia(s).`;
        for (const phone of ownerPhonesList) {
          await sendEvolutionMessage(baseUrl, apiKey, instance, phone, text);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("inventory-alert error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

