import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IngredientStock = {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  stock_quantity: number;
  min_stock: number;
  expiry_date: string | null;
  created_at: string;
};

export function useIngredientStock() {
  return useQuery({
    queryKey: ['ingredient-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as IngredientStock[];
    },
  });
}

export function useAddIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ingredient: {
      name: string;
      unit: string;
      price_per_unit: number;
      stock_quantity: number;
      min_stock: number;
      expiry_date: string | null;
    }) => {
      const { error } = await supabase.from('ingredients').insert(ingredient);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredient-stock'] }),
  });
}

export function useUpdateIngredientStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      stock_quantity?: number;
      min_stock?: number;
      expiry_date?: string | null;
    }) => {
      const { error } = await supabase.from('ingredients').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredient-stock'] }),
  });
}

export function useLowStockCount() {
  return useQuery({
    queryKey: ['ingredient-stock', 'low-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, stock_quantity, min_stock');
      if (error) throw error;
      return (data as IngredientStock[]).filter(i => i.stock_quantity <= i.min_stock && i.min_stock > 0).length;
    },
    refetchInterval: 30000,
  });
}
