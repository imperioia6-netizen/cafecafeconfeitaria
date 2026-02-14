import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CashRegisterName = 'caixa_1' | 'caixa_2' | 'delivery';

const registerLabels: Record<CashRegisterName, string> = {
  caixa_1: 'Caixa 1',
  caixa_2: 'Caixa 2',
  delivery: 'Delivery',
};

export { registerLabels };

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

export function useClosingHistory(limit = 20) {
  return useQuery({
    queryKey: ['cash_closings', 'history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_closings')
        .select('*, cash_registers(name), closing_details(*)')
        .order('closed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useOpenRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: CashRegisterName; opened_by: string; opening_balance: number }) => {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          name: input.name,
          opened_by: input.opened_by,
          opening_balance: input.opening_balance,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_registers'] }),
  });
}

export function useCloseRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { registerId: string; closedBy: string; notes?: string }) => {
      // Get all sales for this register since it was opened
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

      // Group by payment method
      const byPayment: Record<string, { total: number; count: number }> = {};
      for (const sale of salesList) {
        const pm = sale.payment_method;
        if (!byPayment[pm]) byPayment[pm] = { total: 0, count: 0 };
        byPayment[pm].total += Number(sale.total);
        byPayment[pm].count += 1;
      }

      // Create closing
      const { data: closing, error: closingErr } = await supabase
        .from('cash_closings')
        .insert({
          cash_register_id: input.registerId,
          closed_by: input.closedBy,
          total_sales: totalSales,
          total_transactions: salesList.length,
          notes: input.notes,
        })
        .select()
        .single();
      if (closingErr) throw closingErr;

      // Create closing details
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

      // Close the register
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
    },
  });
}

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
