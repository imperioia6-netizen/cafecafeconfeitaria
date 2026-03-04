import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePeriodReport(days: number) {
  return useQuery({
    queryKey: ['reports', 'period', days],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);

      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - days);

      // Current period sales
      const { data: currentSales } = await supabase
        .from('sales')
        .select('total, payment_method, channel, sold_at')
        .gte('sold_at', start.toISOString())
        .lte('sold_at', now.toISOString());

      // Previous period sales
      const { data: prevSales } = await supabase
        .from('sales')
        .select('total, payment_method, channel, sold_at')
        .gte('sold_at', prevStart.toISOString())
        .lt('sold_at', start.toISOString());

      const current = currentSales ?? [];
      const prev = prevSales ?? [];

      const currentTotal = current.reduce((s, x) => s + Number(x.total), 0);
      const prevTotal = prev.reduce((s, x) => s + Number(x.total), 0);
      const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

      // By payment method
      const byPayment: Record<string, number> = {};
      for (const s of current) {
        byPayment[s.payment_method] = (byPayment[s.payment_method] ?? 0) + Number(s.total);
      }

      // By channel
      const byChannel: Record<string, number> = {};
      for (const s of current) {
        byChannel[s.channel] = (byChannel[s.channel] ?? 0) + Number(s.total);
      }

      // Daily breakdown
      const dailyMap: Record<string, number> = {};
      for (const s of current) {
        const day = new Date(s.sold_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dailyMap[day] = (dailyMap[day] ?? 0) + Number(s.total);
      }
      const daily = Object.entries(dailyMap).map(([date, total]) => ({ date, total }));

      return {
        currentTotal,
        prevTotal,
        growth,
        salesCount: current.length,
        avgTicket: current.length > 0 ? currentTotal / current.length : 0,
        byPayment,
        byChannel,
        daily,
      };
    },
  });
}

export function useProductionVsSales(days: number) {
  return useQuery({
    queryKey: ['reports', 'prodVsSales', days],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);

      // Productions
      const { data: productions } = await supabase
        .from('productions')
        .select('recipe_id, slices_generated, total_cost, recipes(name)')
        .gte('produced_at', start.toISOString());

      // Sale items
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('recipe_id, quantity, subtotal, sales!inner(sold_at)')
        .gte('sales.sold_at', start.toISOString());

      const prodList = productions ?? [];
      const itemsList = saleItems ?? [];

      // Group by recipe
      const recipes: Record<string, {
        name: string;
        produced: number;
        sold: number;
        prodCost: number;
        soldRevenue: number;
      }> = {};

      for (const p of prodList) {
        const id = p.recipe_id;
        if (!recipes[id]) recipes[id] = { name: (p.recipes as any)?.name ?? '—', produced: 0, sold: 0, prodCost: 0, soldRevenue: 0 };
        recipes[id].produced += p.slices_generated;
        recipes[id].prodCost += Number(p.total_cost);
      }

      for (const si of itemsList) {
        const id = si.recipe_id;
        if (!recipes[id]) recipes[id] = { name: '—', produced: 0, sold: 0, prodCost: 0, soldRevenue: 0 };
        recipes[id].sold += si.quantity;
        recipes[id].soldRevenue += Number(si.subtotal);
      }

      const result = Object.entries(recipes).map(([id, r]) => ({
        recipe_id: id,
        name: r.name,
        produced: r.produced,
        sold: r.sold,
        waste: r.produced - r.sold,
        wastePercent: r.produced > 0 ? ((r.produced - r.sold) / r.produced) * 100 : 0,
        prodCost: r.prodCost,
        soldRevenue: r.soldRevenue,
      }));

      return result;
    },
  });
}
