import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { period_days = 7 } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - period_days);
    start.setHours(0, 0, 0, 0);

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - period_days);

    // Fetch current and previous period sales
    const [currentRes, prevRes, prodRes] = await Promise.all([
      supabase.from("sales").select("total, payment_method, channel, sold_at").gte("sold_at", start.toISOString()).lte("sold_at", now.toISOString()),
      supabase.from("sales").select("total, payment_method, channel, sold_at").gte("sold_at", prevStart.toISOString()).lt("sold_at", start.toISOString()),
      supabase.from("productions").select("recipe_id, slices_generated, total_cost, recipes(name)").gte("produced_at", start.toISOString()),
    ]);

    const current = currentRes.data || [];
    const prev = prevRes.data || [];
    const productions = prodRes.data || [];

    const currentTotal = current.reduce((s: number, x: any) => s + Number(x.total), 0);
    const prevTotal = prev.reduce((s: number, x: any) => s + Number(x.total), 0);
    const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100) : 0;
    const avgTicket = current.length > 0 ? currentTotal / current.length : 0;
    const totalProdCost = productions.reduce((s: number, p: any) => s + Number(p.total_cost), 0);
    const margin = currentTotal > 0 ? ((currentTotal - totalProdCost) / currentTotal * 100) : 0;

    // By payment method
    const byPayment: Record<string, number> = {};
    for (const s of current) byPayment[s.payment_method] = (byPayment[s.payment_method] || 0) + Number(s.total);

    // By channel
    const byChannel: Record<string, number> = {};
    for (const s of current) byChannel[s.channel] = (byChannel[s.channel] || 0) + Number(s.total);

    const metrics = {
      currentTotal, prevTotal, growth, salesCount: current.length,
      prevSalesCount: prev.length, avgTicket, totalProdCost, margin,
      byPayment, byChannel, period_days,
    };

    // Generate AI analysis
    let content = "";
    let suggestions: string[] = [];

    if (apiKey) {
      const prompt = `Você é o assistente financeiro do Café Café Confeitaria. Analise os dados abaixo e gere um relatório conversacional para o Felipe (dono).

DADOS DO PERÍODO (${period_days} dias):
- Faturamento atual: R$ ${currentTotal.toFixed(2)}
- Faturamento anterior: R$ ${prevTotal.toFixed(2)}
- Crescimento: ${growth.toFixed(1)}%
- Vendas: ${current.length} (anterior: ${prev.length})
- Ticket médio: R$ ${avgTicket.toFixed(2)}
- Custo produção: R$ ${totalProdCost.toFixed(2)}
- Margem: ${margin.toFixed(1)}%
- Por canal: ${JSON.stringify(byChannel)}
- Por pagamento: ${JSON.stringify(byPayment)}

Responda em português brasileiro, tom amigável e profissional. Comece com "Felipe, aqui está o fechamento dos últimos ${period_days} dias...". Inclua: resumo, comparativo, destaques positivos, pontos de atenção, e 3 sugestões práticas.`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          content = aiData.choices?.[0]?.message?.content || "";
        } else if (aiRes.status === 429) {
          content = `Felipe, aqui está o fechamento dos últimos ${period_days} dias. Faturamento: R$ ${currentTotal.toFixed(2)} (${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs período anterior). ${current.length} vendas realizadas com ticket médio de R$ ${avgTicket.toFixed(2)}.`;
        } else {
          const errText = await aiRes.text();
          console.error("AI error:", aiRes.status, errText);
          content = `Relatório dos últimos ${period_days} dias: Faturamento R$ ${currentTotal.toFixed(2)}, ${current.length} vendas, ticket médio R$ ${avgTicket.toFixed(2)}.`;
        }
      } catch (aiErr) {
        console.error("AI fetch error:", aiErr);
        content = `Relatório dos últimos ${period_days} dias: Faturamento R$ ${currentTotal.toFixed(2)}, ${current.length} vendas.`;
      }
    } else {
      content = `Felipe, aqui está o fechamento dos últimos ${period_days} dias.\n\nFaturamento: R$ ${currentTotal.toFixed(2)} (${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs período anterior).\nVendas: ${current.length} (anterior: ${prev.length})\nTicket médio: R$ ${avgTicket.toFixed(2)}\nCusto de produção: R$ ${totalProdCost.toFixed(2)}\nMargem: ${margin.toFixed(1)}%`;
    }

    // Determine report type
    const reportType = period_days <= 7 ? "weekly" : period_days <= 15 ? "biweekly" : "monthly";

    // Save report
    const { data: report, error: saveErr } = await supabase.from("ai_reports").insert({
      report_type: reportType,
      period_days,
      content,
      summary: `Faturamento R$ ${currentTotal.toFixed(2)} | ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% | ${current.length} vendas`,
      metrics,
      suggestions,
    }).select().single();

    if (saveErr) throw saveErr;

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
