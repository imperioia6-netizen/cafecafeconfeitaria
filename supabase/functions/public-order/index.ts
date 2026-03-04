import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { customer_name, customer_phone, items, order_number: clientOrderNumber } = await req.json();

    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Nome do cliente é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Pedido deve conter pelo menos um item" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all requested recipes to validate and get server-side prices
    const recipeIds = items.map((i: any) => i.recipe_id);
    const { data: recipes, error: recipesErr } = await supabase
      .from("recipes")
      .select("id, name, sale_price, active, sells_whole, sells_slice, whole_price, slice_price")
      .in("id", recipeIds);

    if (recipesErr) throw recipesErr;

    if (!recipes || recipes.length !== recipeIds.length) {
      return new Response(JSON.stringify({ error: "Um ou mais produtos não foram encontrados" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inactiveRecipe = recipes.find((r) => !r.active);
    if (inactiveRecipe) {
      return new Response(
        JSON.stringify({ error: `Produto "${inactiveRecipe.name}" não está disponível` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build recipe map
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const orderNumber = (typeof clientOrderNumber === "string" && clientOrderNumber.trim().length > 0)
      ? clientOrderNumber.trim()
      : `CD-${Date.now().toString(36).toUpperCase()}`;

    const systemOperatorId = "00000000-0000-0000-0000-000000000000";

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        operator_id: systemOperatorId,
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone?.trim() || null,
        channel: "cardapio_digital",
        status: "aberto",
        delivery_status: "recebido",
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create order items with correct prices per unit_type
    const orderItems = items.map((item: any) => {
      const recipe = recipeMap.get(item.recipe_id)!;
      const unitType = item.unit_type || "slice";

      // Validate mode is enabled
      if (unitType === "whole" && !recipe.sells_whole) {
        throw new Error(`Produto "${recipe.name}" não vende inteiro`);
      }
      if (unitType === "slice" && !recipe.sells_slice) {
        throw new Error(`Produto "${recipe.name}" não vende fatia`);
      }

      // Get correct price
      let price: number;
      if (unitType === "whole" && recipe.whole_price) {
        price = Number(recipe.whole_price);
      } else if (unitType === "slice" && recipe.slice_price) {
        price = Number(recipe.slice_price);
      } else {
        price = Number(recipe.sale_price);
      }

      const qty = Math.max(1, Math.floor(Number(item.quantity)));
      return {
        order_id: order.id,
        recipe_id: item.recipe_id,
        quantity: qty,
        unit_price: price,
        subtotal: qty * price,
        unit_type: unitType,
        notes: typeof item.notes === "string" && item.notes.trim().length > 0 ? item.notes.trim() : null,
      };
    });

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) throw itemsErr;

    const total = orderItems.reduce((s, i) => s + i.subtotal, 0);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: orderNumber,
        total,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("public-order error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro ao processar pedido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
