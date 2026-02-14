import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [salesRes, criticalRes, alertsRes] = await Promise.all([
        supabase.from('sales').select('total').gte('sold_at', todayISO),
        supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('status', 'critico').gt('slices_available', 0),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('resolved', false),
      ]);

      const sales = salesRes.data ?? [];
      const revenue = sales.reduce((s, r) => s + Number(r.total), 0);
      const count = sales.length;

      return {
        revenue,
        salesCount: count,
        avgTicket: count > 0 ? revenue / count : 0,
        criticalStock: criticalRes.count ?? 0,
        activeAlerts: alertsRes.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

export function useSalesChart() {
  return useQuery({
    queryKey: ['dashboard', 'chart'],
    queryFn: async () => {
      const days = 7;
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sales')
        .select('total, sold_at')
        .gte('sold_at', since.toISOString())
        .order('sold_at');
      if (error) throw error;

      // Group by day
      const grouped: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        grouped[d.toISOString().split('T')[0]] = 0;
      }
      (data ?? []).forEach(s => {
        const day = new Date(s.sold_at).toISOString().split('T')[0];
        if (grouped[day] !== undefined) grouped[day] += Number(s.total);
      });

      return Object.entries(grouped).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
        total,
      }));
    },
  });
}
