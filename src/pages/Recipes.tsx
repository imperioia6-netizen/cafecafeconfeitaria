import { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useRecipes } from '@/hooks/useRecipes';
import RecipeForm from '@/components/recipes/RecipeForm';
import RecipeCard from '@/components/recipes/RecipeCard';
import { ChefHat, Loader2, Package, TrendingUp, Percent } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Recipe } from '@/hooks/useRecipes';

type MarginTab = 'todos' | 'margem_alta' | 'margem_media' | 'margem_baixa' | 'sem_precificacao';

function classifyRecipe(r: Recipe): Exclude<MarginTab, 'todos'> {
  const cost = r.direct_cost ? Number(r.direct_cost) : 0;
  const price = Number(r.sale_price);
  if (price <= 0) return 'sem_precificacao';
  const margin = ((price - cost) / price) * 100;
  if (margin >= 50) return 'margem_alta';
  if (margin >= 30) return 'margem_media';
  return 'margem_baixa';
}

const tabConfig: { value: MarginTab; label: string; color: string }[] = [
  { value: 'todos', label: 'Todos', color: 'text-foreground' },
  { value: 'margem_alta', label: 'Margem Alta', color: 'text-success' },
  { value: 'margem_media', label: 'Margem Média', color: 'text-warning' },
  { value: 'margem_baixa', label: 'Margem Baixa', color: 'text-destructive' },
  { value: 'sem_precificacao', label: 'Sem Preço', color: 'text-muted-foreground' },
];

const Recipes = () => {
  const { data: recipes, isLoading } = useRecipes();
  const { isOwner } = useAuth();
  const [tab, setTab] = useState<MarginTab>('todos');

  const grouped = useMemo(() => {
    if (!recipes) return { todos: [], margem_alta: [], margem_media: [], margem_baixa: [], sem_precificacao: [] };
    const g: Record<MarginTab, Recipe[]> = { todos: recipes, margem_alta: [], margem_media: [], margem_baixa: [], sem_precificacao: [] };
    recipes.forEach(r => { g[classifyRecipe(r)].push(r); });
    return g;
  }, [recipes]);

  const filtered = grouped[tab];

  const kpis = useMemo(() => {
    if (!filtered.length) return { count: 0, avgPrice: 0, avgMargin: 0 };
    let totalPrice = 0, totalMargin = 0, marginCount = 0;
    filtered.forEach(r => {
      const price = Number(r.sale_price);
      const cost = r.direct_cost ? Number(r.direct_cost) : 0;
      totalPrice += price;
      if (price > 0) { totalMargin += ((price - cost) / price) * 100; marginCount++; }
    });
    return { count: filtered.length, avgPrice: totalPrice / filtered.length, avgMargin: marginCount > 0 ? totalMargin / marginCount : 0 };
  }, [filtered]);

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Produtos</h1>
            <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">
              {isOwner ? 'Cadastrar e gerenciar produtos' : 'Catálogo de produtos'}
            </p>
          </div>
          {isOwner && <RecipeForm />}
        </div>

        {isOwner && recipes && recipes.length > 0 && (
          <>
            <Tabs value={tab} onValueChange={v => setTab(v as MarginTab)}>
              <TabsList className="w-full h-auto gap-1 bg-muted/50 p-1.5 overflow-x-auto no-scrollbar flex flex-nowrap">
                {tabConfig.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="text-xs data-[state=active]:shadow-md">
                    <span className={tab === t.value ? t.color : ''}>{t.label}</span>
                    <span className="ml-1.5 text-[10px] opacity-60">({grouped[t.value].length})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { icon: Package, label: 'Produtos', value: String(kpis.count) },
                { icon: TrendingUp, label: 'Preço Médio', value: `R$ ${kpis.avgPrice.toFixed(2)}` },
                { icon: Percent, label: 'Margem Média', value: `${kpis.avgMargin.toFixed(0)}%`, color: kpis.avgMargin >= 50 ? 'text-success' : kpis.avgMargin >= 30 ? 'text-warning' : 'text-destructive' },
              ].map(k => (
                <div key={k.label} className="glass rounded-lg p-3 text-center">
                  <k.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{k.label}</p>
                  <p className={`font-mono-numbers font-semibold text-sm ${k.color ?? ''}`}>{k.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ChefHat className="h-16 w-16 mb-4 opacity-15" />
            <p className="text-sm">{tab === 'todos' ? 'Nenhum produto cadastrado.' : 'Nenhum produto nesta faixa.'}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} readOnly={!isOwner} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Recipes;
