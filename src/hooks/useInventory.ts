import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type InventoryItem = Tables<'inventory'> & {
  recipes?: { name: string; category: string; photo_url: string | null; sale_price: number } | null;
};

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, recipes(name, category, photo_url, sale_price)')
        .gt('slices_available', 0)
        .order('produced_at', { ascending: false });
      if (error) throw error;
      return data as InventoryItem[];
    },
    refetchInterval: 60000, // refresh every minute
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
        .update({ slices_available: 0, status: 'critico' as const })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}
