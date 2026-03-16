import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RECEIVE_ORDERS_URL = "https://dlugexjpftqwkfawlnov.supabase.co/functions/v1/receive-orders";
const SYNC_CUSTOMERS_URL = "https://dlugexjpftqwkfawlnov.supabase.co/functions/v1/sync-customers";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer_name,
      customer_phone,
      items,
      payment_method,
      delivery_date,
      delivery_time,
      delivery_type,
      channel,
      address,
    } = body;

    // --- Parse address ---
    let street = "";
    let number = "";
    let neighborhood = "";
    let city = "Osasco";
    if (address && typeof address === "string") {
      const parts = address.split(",").map((p: string) => p.trim());
      street = parts[0] || "";
      if (parts[1]) number = parts[1];
      if (parts[2]) neighborhood = parts[2];
      if (parts[3]) city = parts[3];
    } else if (address && typeof address === "object") {
      street = address.street || "";
      number = address.number || "";
      neighborhood = address.neighborhood || "";
      city = address.city || "Osasco";
    }

    const phone = (customer_phone || "").replace(/\D/g, "");

    // --- 1. Sync customer ---
    try {
      await fetch(SYNC_CUSTOMERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            name: customer_name || "Cliente",
            phone: customer_phone || phone,
            street,
            number,
            neighborhood,
            city,
          },
        ]),
      });
    } catch (e) {
      console.error("sync-customers error:", (e as Error).message);
    }

    // --- 2. Forward order ---
    if (items && Array.isArray(items) && items.length > 0) {
      const orderPayload = {
        customer: {
          name: customer_name || "Cliente",
          phone: customer_phone || phone,
          street,
          number,
          neighborhood,
          city,
        },
        items: items.map((it: any) => ({
          productName: it.product_name || it.productName || it.name || "Produto",
          quantity: it.quantity || 1,
          unitPrice: it.unit_price || it.unitPrice || 0,
          category: it.category || "OTHER",
          unit: it.unit || "UN",
        })),
        paymentMethod: payment_method || "cash",
        deliveryDate: delivery_date || undefined,
        deliveryTime: delivery_time || undefined,
        deliveryType: delivery_type || (channel === "delivery" ? "delivery" : "pickup"),
      };

      try {
        const res = await fetch(RECEIVE_ORDERS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("receive-orders error:", res.status, txt.slice(0, 300));
        }
      } catch (e) {
        console.error("receive-orders exception:", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("forward-order error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
