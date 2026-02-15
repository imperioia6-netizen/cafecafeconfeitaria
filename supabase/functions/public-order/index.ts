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
    const { customer_name, customer_phone, items } = await req.json();

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
      .select("id, name, sale_price, active")
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

    // Build price map from server data
    const priceMap = new Map(recipes.map((r) => [r.id, Number(r.sale_price)]));

    // Generate a simple order number
    const orderNumber = `CD-${Date.now().toString(36).toUpperCase()}`;

    // Create the order - use a system UUID for operator_id since there's no logged-in user
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
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create order items with server-side prices
    const orderItems = items.map((item: any) => {
      const price = priceMap.get(item.recipe_id)!;
      const qty = Math.max(1, Math.floor(Number(item.quantity)));
      return {
        order_id: order.id,
        recipe_id: item.recipe_id,
        quantity: qty,
        unit_price: price,
        subtotal: qty * price,
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
    return new Response(JSON.stringify({ error: "Erro ao processar pedido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
