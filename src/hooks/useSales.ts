import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Database } from '@/integrations/supabase/types';

export type Sale = Tables<'sales'>;
export type SaleItem = Tables<'sale_items'>;

type SalesChannel = Database['public']['Enums']['sales_channel'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

export interface CartItem {
  recipe_id: string;
  recipe_name: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  max_available: number;
  unit_type?: 'whole' | 'slice';
  unit_weight_grams?: number;
}

export function useTodaySales() {
  return useQuery({
    queryKey: ['sales', 'today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*, recipes(name))')
        .gte('sold_at', today.toISOString())
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      operator_id: string;
      channel: SalesChannel;
      payment_method: PaymentMethod;
      total: number;
      items: CartItem[];
      order_number?: string;
      table_number?: string;
      customer_name?: string;
    }) => {
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          operator_id: input.operator_id,
          channel: input.channel,
          payment_method: input.payment_method,
          total: input.total,
          order_number: input.order_number || null,
          table_number: input.table_number || null,
          customer_name: input.customer_name || null,
        } as any)
        .select()
        .single();
      if (saleErr) throw saleErr;

      const { error: itemsErr } = await supabase.from('sale_items').insert(
        input.items.map(item => ({
          sale_id: sale.id,
          recipe_id: item.recipe_id,
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          unit_type: item.unit_type || 'slice',
        } as any))
      );
      if (itemsErr) throw itemsErr;

      // Deduct stock_grams from inventory
      for (const item of input.items) {
        const weightToDeduct = (item.unit_weight_grams || 0) * item.quantity;
        if (weightToDeduct > 0) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('stock_grams, slices_available')
            .eq('id', item.inventory_id)
            .single();
          if (inv) {
            const newGrams = Math.max(0, (Number((inv as any).stock_grams) || 0) - weightToDeduct);
            const newSlices = Math.max(0, inv.slices_available - item.quantity);
            await supabase
              .from('inventory')
              .update({ stock_grams: newGrams, slices_available: newSlices } as any)
              .eq('id', item.inventory_id);
          }
        } else {
          // Fallback: old behavior
          const { data: inv } = await supabase
            .from('inventory')
            .select('slices_available')
            .eq('id', item.inventory_id)
            .single();
          if (inv) {
            await supabase
              .from('inventory')
              .update({ slices_available: inv.slices_available - item.quantity })
              .eq('id', item.inventory_id);
          }
        }
      }

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
