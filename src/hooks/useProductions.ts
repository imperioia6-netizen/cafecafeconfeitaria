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
      const { data: prod, error: prodErr } = await supabase
        .from('productions')
        .insert(input)
        .select()
        .single();
      if (prodErr) throw prodErr;

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

export function useDeleteProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productionId: string) => {
      // Delete inventory first (FK dependency)
      const { error: invErr } = await supabase
        .from('inventory')
        .delete()
        .eq('production_id', productionId);
      if (invErr) throw invErr;

      const { error: prodErr } = await supabase
        .from('productions')
        .delete()
        .eq('id', productionId);
      if (prodErr) throw prodErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productions'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      weight_produced_g: number;
      slices_generated: number;
      total_cost: number;
    }) => {
      const { error: prodErr } = await supabase
        .from('productions')
        .update({
          weight_produced_g: input.weight_produced_g,
          slices_generated: input.slices_generated,
          total_cost: input.total_cost,
        })
        .eq('id', input.id);
      if (prodErr) throw prodErr;

      const { error: invErr } = await supabase
        .from('inventory')
        .update({ slices_available: input.slices_generated })
        .eq('production_id', input.id);
      if (invErr) throw invErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productions'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
