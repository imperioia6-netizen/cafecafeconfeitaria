import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns';

export type CashRegisterName = 'caixa_1' | 'caixa_2' | 'delivery';

const registerLabels: Record<CashRegisterName, string> = {
  caixa_1: 'Caixa 1',
  caixa_2: 'Caixa 2',
  delivery: 'Delivery',
};

export { registerLabels };

// ─── Open registers ───
export function useOpenRegisters() {
  return useQuery({
    queryKey: ['cash_registers', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('is_open', true)
        .order('opened_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Real-time sales summary for an open register ───
export function useRegisterSalesSummary(registerId: string | undefined, openedAt: string | undefined) {
  return useQuery({
    queryKey: ['register_sales_summary', registerId],
    enabled: !!registerId && !!openedAt,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: sales, error } = await supabase
        .from('sales')
        .select('total, payment_method')
        .eq('cash_register_id', registerId!)
        .gte('sold_at', openedAt!);
      if (error) throw error;
      const list = sales ?? [];
      const totalSales = list.reduce((s, sale) => s + Number(sale.total), 0);
      const byPayment: Record<string, { total: number; count: number }> = {};
      for (const sale of list) {
        const pm = sale.payment_method;
        if (!byPayment[pm]) byPayment[pm] = { total: 0, count: 0 };
        byPayment[pm].total += Number(sale.total);
        byPayment[pm].count += 1;
      }
      return { totalSales, totalCount: list.length, byPayment };
    },
  });
}

// ─── Day summary KPIs ───
export function useDaySummary() {
  return useQuery({
    queryKey: ['day_summary', new Date().toDateString()],
    refetchInterval: 30000,
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const [salesRes, closingsRes] = await Promise.all([
        supabase.from('sales').select('total').gte('sold_at', todayStart).lte('sold_at', todayEnd),
        supabase.from('cash_closings').select('id').gte('closed_at', todayStart).lte('closed_at', todayEnd),
      ]);

      const sales = salesRes.data ?? [];
      const revenue = sales.reduce((s, sale) => s + Number(sale.total), 0);
      const count = sales.length;
      const avgTicket = count > 0 ? revenue / count : 0;
      const closedCount = closingsRes.data?.length ?? 0;

      return { revenue, count, avgTicket, closedCount };
    },
  });
}

// ─── Closing history with filters ───
export type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export function useClosingHistory(dateFilter: DateFilter = 'all', registerFilter: string = 'all', limit = 30) {
  return useQuery({
    queryKey: ['cash_closings', 'history', dateFilter, registerFilter, limit],
    queryFn: async () => {
      let query = supabase
        .from('cash_closings')
        .select('*, cash_registers(name, opened_by, opening_balance, opened_at), closing_details(*)')
        .order('closed_at', { ascending: false })
        .limit(limit);

      // Date filter
      const now = new Date();
      if (dateFilter === 'today') {
        query = query.gte('closed_at', startOfDay(now).toISOString());
      } else if (dateFilter === 'yesterday') {
        const yest = subDays(now, 1);
        query = query.gte('closed_at', startOfDay(yest).toISOString()).lte('closed_at', endOfDay(yest).toISOString());
      } else if (dateFilter === 'week') {
        query = query.gte('closed_at', subDays(now, 7).toISOString());
      } else if (dateFilter === 'month') {
        query = query.gte('closed_at', startOfMonth(now).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side register name filter
      let filtered = data ?? [];
      if (registerFilter !== 'all') {
        filtered = filtered.filter((c: any) => (c.cash_registers as any)?.name === registerFilter);
      }

      // Fetch profile names for closed_by and opened_by
      const userIds = new Set<string>();
      for (const c of filtered) {
        userIds.add(c.closed_by);
        const reg = c.cash_registers as any;
        if (reg?.opened_by) userIds.add(reg.opened_by);
      }
      const ids = Array.from(userIds);
      let profileMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', ids);
        for (const p of profiles ?? []) {
          profileMap[p.user_id] = p.name;
        }
      }

      return { closings: filtered, profileMap };
    },
  });
}

// ─── Open register ───
export function useOpenRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: CashRegisterName; opened_by: string; opening_balance: number }) => {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({ name: input.name, opened_by: input.opened_by, opening_balance: input.opening_balance })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_registers'] }),
  });
}

// ─── Close register (with cash reconciliation) ───
export function useCloseRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { registerId: string; closedBy: string; notes?: string; countedCash?: number }) => {
      const { data: register } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('id', input.registerId)
        .single();
      if (!register) throw new Error('Caixa não encontrado');

      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('cash_register_id', input.registerId)
        .gte('sold_at', register.opened_at);

      const salesList = sales ?? [];
      const totalSales = salesList.reduce((s, sale) => s + Number(sale.total), 0);

      const byPayment: Record<string, { total: number; count: number }> = {};
      for (const sale of salesList) {
        const pm = sale.payment_method;
        if (!byPayment[pm]) byPayment[pm] = { total: 0, count: 0 };
        byPayment[pm].total += Number(sale.total);
        byPayment[pm].count += 1;
      }

      // Calculate cash difference
      const expectedCash = Number(register.opening_balance) + (byPayment['dinheiro']?.total ?? 0);
      const countedCash = input.countedCash ?? null;
      const cashDifference = countedCash !== null ? countedCash - expectedCash : null;

      const { data: closing, error: closingErr } = await supabase
        .from('cash_closings')
        .insert({
          cash_register_id: input.registerId,
          closed_by: input.closedBy,
          total_sales: totalSales,
          total_transactions: salesList.length,
          notes: input.notes,
          counted_cash: countedCash,
          cash_difference: cashDifference,
        })
        .select()
        .single();
      if (closingErr) throw closingErr;

      const details = Object.entries(byPayment).map(([pm, d]) => ({
        closing_id: closing.id,
        payment_method: pm as any,
        total: d.total,
        transaction_count: d.count,
      }));
      if (details.length > 0) {
        const { error: detailsErr } = await supabase.from('closing_details').insert(details);
        if (detailsErr) throw detailsErr;
      }

      const { error: updateErr } = await supabase
        .from('cash_registers')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('id', input.registerId);
      if (updateErr) throw updateErr;

      return closing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      qc.invalidateQueries({ queryKey: ['cash_closings'] });
      qc.invalidateQueries({ queryKey: ['day_summary'] });
      qc.invalidateQueries({ queryKey: ['register_sales_summary'] });
    },
  });
}

// ─── Delete closing ───
export function useDeleteClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (closingId: string) => {
      const { error: detErr } = await supabase.from('closing_details').delete().eq('closing_id', closingId);
      if (detErr) throw detErr;
      const { error } = await supabase.from('cash_closings').delete().eq('id', closingId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_closings'] }),
  });
}

// ─── Update closing ───
export function useUpdateClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from('cash_closings').update({ notes }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_closings'] }),
  });
}
