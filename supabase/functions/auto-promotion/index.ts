import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find inventory items older than 12h with slices available
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { data: oldItems, error: invErr } = await supabase
      .from("inventory")
      .select("id, recipe_id, slices_available, produced_at, recipes(name, sale_price, category)")
      .gt("slices_available", 0)
      .lt("produced_at", twelveHoursAgo)
      .order("produced_at", { ascending: true });

    if (invErr) throw invErr;
    if (!oldItems || oldItems.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum item com 12h+", promotions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which already have active promotions
    const inventoryIds = oldItems.map((i: any) => i.id);
    const { data: existing } = await supabase
      .from("auto_promotions")
      .select("inventory_id")
      .in("inventory_id", inventoryIds)
      .in("status", ["pendente", "enviada"]);

    const existingSet = new Set((existing || []).map((e: any) => e.inventory_id));

    // Generate promotions for items without one
    const newPromos: any[] = [];
    for (const item of oldItems as any[]) {
      if (existingSet.has(item.id)) continue;

      const hoursInStock = (Date.now() - new Date(item.produced_at).getTime()) / (1000 * 60 * 60);
      const discountPercent = hoursInStock >= 18 ? 30 : 20;
      const originalPrice = Number(item.recipes?.sale_price || 0);
      const promoPrice = originalPrice * (1 - discountPercent / 100);
      const recipeName = item.recipes?.name || "Produto";

      const message = `🎂 PROMOÇÃO ESPECIAL! ${recipeName} com ${discountPercent}% OFF! De R$${originalPrice.toFixed(2)} por apenas R$${promoPrice.toFixed(2)}. ${item.slices_available} fatias disponíveis. Peça agora pelo delivery! 🚀`;

      newPromos.push({
        inventory_id: item.id,
        recipe_id: item.recipe_id,
        original_price: originalPrice,
        discount_percent: discountPercent,
        promo_price: promoPrice,
        hours_in_stock: Math.round(hoursInStock),
        message_content: message,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (newPromos.length > 0) {
      const { error: insertErr } = await supabase.from("auto_promotions").insert(newPromos);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({
      message: `${newPromos.length} promoções geradas`,
      promotions: newPromos,
      skipped: existingSet.size,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-promotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
