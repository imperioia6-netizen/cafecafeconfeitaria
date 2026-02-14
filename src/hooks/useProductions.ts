import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Production = Tables<'productions'>;

export function useTodayProductions() {
  return useQuery({
    queryKey: ['productions', 'today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('productions')
        .select('*, recipes(name, category, sale_price, direct_cost)')
        .gte('produced_at', today.toISOString())
        .order('produced_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      recipe_id: string;
      operator_id: string;
      weight_produced_g: number;
      slices_generated: number;
      total_cost: number;
    }) => {
      // Insert production
      const { data: prod, error: prodErr } = await supabase
        .from('productions')
        .insert(input)
        .select()
        .single();
      if (prodErr) throw prodErr;

      // Insert inventory
      const { error: invErr } = await supabase.from('inventory').insert({
        production_id: prod.id,
        recipe_id: input.recipe_id,
        slices_available: input.slices_generated,
      });
      if (invErr) throw invErr;

      return prod;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productions'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
