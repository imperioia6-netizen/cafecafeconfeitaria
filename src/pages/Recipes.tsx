import AppLayout from '@/components/layout/AppLayout';
import { useRecipes } from '@/hooks/useRecipes';
import RecipeForm from '@/components/recipes/RecipeForm';
import RecipeCard from '@/components/recipes/RecipeCard';
import { ChefHat, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Recipes = () => {
  const { data: recipes, isLoading } = useRecipes();
  const { isOwner } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Produtos</h1>
            <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">
              {isOwner ? 'Cadastrar e gerenciar produtos' : 'Catálogo de produtos'}
            </p>
          </div>
          {isOwner && <RecipeForm />}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !recipes?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ChefHat className="h-16 w-16 mb-4 opacity-15" />
            <p className="text-sm">Nenhum produto cadastrado.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} readOnly={!isOwner} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Recipes;
