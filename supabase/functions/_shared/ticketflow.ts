import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Envia o pedido/encomenda para a função edge `receive-orders`,
 * no formato exato que você passou (customer, items, paymentMethod, etc.).
 */
export async function sendTicketFlowOrder(
  supabase: SupabaseClient,
  phone: string,
  params: {
    type: "pedido" | "encomenda";
    external_id?: string | null;
    channel: string;
    total: number;
    payment_method: string;
    items: { name: string; quantity: number; unit_price: number; category?: string | null; unit?: string | null }[];
    deliveryDate?: string | null;
    deliveryTime?: string | null;
  }
): Promise<void> {
  const endpoint = "https://dlugexjpftqwkfawlnov.supabase.co/functions/v1/receive-orders";
  const normalizedPhone = phone.replace(/\D/g, "");

  // Busca dados do cliente no Supabase para preencher endereço
  let customerDb: { name?: string; phone?: string; address?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("customers")
      .select("name, phone, address")
      .eq("phone", normalizedPhone)
      .maybeSingle();
    customerDb = (data as any) ?? null;
  } catch {
    customerDb = null;
  }

  const customerName = customerDb?.name || "Cliente WhatsApp";
  const customerPhone = customerDb?.phone || normalizedPhone;
  const fullAddress = (customerDb?.address || "").trim();

  // Tentativa simples de quebrar endereço em rua/número/bairro/cidade
  let street = "";
  let number = "";
  let neighborhood = "";
  let city = "Osasco";
  if (fullAddress) {
    const parts = fullAddress.split(",").map((p) => p.trim());
    street = parts[0] || "";
    if (parts[1]) number = parts[1];
    if (parts[2]) neighborhood = parts[2];
    if (parts[3]) city = parts[3];
  }

  const deliveryType = params.channel === "retirada" ? "pickup" : "delivery";

  const body = {
    customer: {
      name: customerName,
      phone: customerPhone,
      street,
      number,
      neighborhood,
      city,
    },
    items: params.items.map((it) => ({
      productName: it.name,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      category: it.category || "OTHER",
      unit: it.unit || "UN",
    })),
    paymentMethod: params.payment_method || "cash",
    deliveryDate: params.deliveryDate || undefined,
    deliveryTime: params.deliveryTime || undefined,
    deliveryType,
    productionDate: params.deliveryDate || undefined,
    productionTime: params.deliveryTime || undefined,
    attendant: "IA WhatsApp",
  };

  // Sync customer to external platform
  const syncCustomersUrl = "https://dlugexjpftqwkfawlnov.supabase.co/functions/v1/sync-customers";
  try {
    await fetch(syncCustomersUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        name: customerName,
        phone: customerPhone,
        street,
        number,
        neighborhood,
        city,
      }]),
    });
  } catch (e) {
    console.error("sync-customers exception", (e as Error).message);
  }

  // Send order to external platform
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("ticketflow receive-orders error", res.status, txt.slice(0, 300));
    }
  } catch (e) {
    console.error("ticketflow receive-orders exception", (e as Error).message);
  }
}

