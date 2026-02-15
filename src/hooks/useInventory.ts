import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type InventoryItem = Tables<'inventory'> & {
  recipes?: { name: string; category: string; photo_url: string | null; sale_price: number; sells_whole?: boolean; sells_slice?: boolean; whole_weight_grams?: number | null; slice_weight_grams?: number | null; whole_price?: number | null; slice_price?: number | null } | null;
  stock_grams?: number;
};

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, recipes(name, category, photo_url, sale_price, sells_whole, sells_slice, whole_weight_grams, slice_weight_grams, whole_price, slice_price)')
        .gt('stock_grams', 0)
        .order('produced_at', { ascending: false });
      if (error) throw error;
      return data as InventoryItem[];
    },
    refetchInterval: 60000,
  });
}

export function useUpdateInventoryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'normal' | 'atencao' | 'critico' }) => {
      const { error } = await supabase.from('inventory').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useDiscardInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory')
        .update({ stock_grams: 0, slices_available: 0, status: 'critico' as const })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}
