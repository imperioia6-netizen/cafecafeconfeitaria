import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Recipe = Tables<'recipes'>;
export type RecipeInsert = TablesInsert<'recipes'>;
export type RecipeUpdate = TablesUpdate<'recipes'>;
export type Ingredient = Tables<'ingredients'>;
export type RecipeIngredient = Tables<'recipe_ingredients'>;

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

export function useActiveRecipes() {
  return useQuery({
    queryKey: ['recipes', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Ingredient[];
    },
  });
}

export function useRecipeIngredients(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe_ingredients', recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*, ingredients(*)')
        .eq('recipe_id', recipeId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: RecipeInsert) => {
      const { data, error } = await supabase.from('recipes').insert(recipe).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: RecipeUpdate & { id: string }) => {
      const { data, error } = await supabase.from('recipes').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ingredient: { name: string; unit: string; price_per_unit: number }) => {
      const { data, error } = await supabase.from('ingredients').insert(ingredient).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  });
}

export function useSaveRecipeIngredients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipeId, ingredients }: { recipeId: string; ingredients: { ingredient_id: string; quantity_used: number }[] }) => {
      // Delete existing
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
      // Insert new
      if (ingredients.length > 0) {
        const { error } = await supabase.from('recipe_ingredients').insert(
          ingredients.map(i => ({ recipe_id: recipeId, ...i }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe_ingredients'] }),
  });
}
