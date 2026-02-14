import AppLayout from '@/components/layout/AppLayout';
import { useRecipes } from '@/hooks/useRecipes';
import RecipeForm from '@/components/recipes/RecipeForm';
import RecipeCard from '@/components/recipes/RecipeCard';
import { ChefHat, Loader2 } from 'lucide-react';

const Recipes = () => {
  const { data: recipes, isLoading } = useRecipes();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receitas</h1>
            <p className="text-muted-foreground mt-1">Cadastrar e gerenciar produtos</p>
          </div>
          <RecipeForm />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !recipes?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ChefHat className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma receita cadastrada. Clique em "Nova Receita" para começar.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map(r => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Recipes;
