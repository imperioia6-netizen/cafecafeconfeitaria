import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const [salesTodayRes, sales7dRes, sales30dRes, criticalRes, alertsRes] = await Promise.all([
        supabase.from('sales').select('total').gte('sold_at', todayStart.toISOString()),
        supabase.from('sales').select('total').gte('sold_at', sevenDaysAgo.toISOString()),
        supabase.from('sales').select('total').gte('sold_at', thirtyDaysAgo.toISOString()),
        supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('status', 'critico').gt('slices_available', 0),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('resolved', false),
      ]);

      const salesToday = salesTodayRes.data ?? [];
      const sales7d = sales7dRes.data ?? [];
      const sales30d = sales30dRes.data ?? [];

      const revenueToday = salesToday.reduce((s, r) => s + Number(r.total), 0);
      const revenue7d = sales7d.reduce((s, r) => s + Number(r.total), 0);
      const revenue30d = sales30d.reduce((s, r) => s + Number(r.total), 0);

      const countToday = salesToday.length;
      const count7d = sales7d.length;
      const count30d = sales30d.length;

      return {
        revenue: revenueToday,
        revenue7d,
        revenue30d,
        salesCount: countToday,
        salesCount7d: count7d,
        salesCount30d: count30d,
        avgTicket: countToday > 0 ? revenueToday / countToday : 0,
        avgTicket7d: count7d > 0 ? revenue7d / count7d : 0,
        avgTicket30d: count30d > 0 ? revenue30d / count30d : 0,
        criticalStock: criticalRes.count ?? 0,
        activeAlerts: alertsRes.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

export function useSalesChart(days: number = 7, customRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['dashboard', 'chart', days, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async () => {
      let since: Date;
      let until: Date;

      if (customRange?.from && customRange?.to) {
        since = new Date(customRange.from);
        since.setHours(0, 0, 0, 0);
        until = new Date(customRange.to);
        until.setHours(23, 59, 59, 999);
      } else {
        since = new Date();
        since.setDate(since.getDate() - days);
        since.setHours(0, 0, 0, 0);
        until = new Date();
        until.setHours(23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from('sales')
        .select('total, sold_at')
        .gte('sold_at', since.toISOString())
        .lte('sold_at', until.toISOString())
        .order('sold_at');
      if (error) throw error;

      const diffMs = until.getTime() - since.getTime();
      const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const grouped: Record<string, number> = {};
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
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
