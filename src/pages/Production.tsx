import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Coffee, Loader2, Layers, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { useCreateProduction, useTodayProductions } from '@/hooks/useProductions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Production = () => {
  const { user } = useAuth();
  const { data: recipes, isLoading: recipesLoading } = useActiveRecipes();
  const { data: productions, isLoading: prodsLoading } = useTodayProductions();
  const createProduction = useCreateProduction();

  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const recipe = recipes?.find(r => r.id === selectedRecipeId);
  const weightG = parseFloat(weightKg) * 1000;
  const slices = recipe && weightG > 0 ? Math.floor(weightG / Number(recipe.slice_weight_g)) : 0;
  const costPerUnit = recipe?.direct_cost ? Number(recipe.direct_cost) : 0;
  const totalCost = costPerUnit * slices;
  const salePrice = recipe ? Number(recipe.sale_price) : 0;
  const marginPerSlice = salePrice - costPerUnit;

  const handleSubmit = async () => {
    if (!recipe || !user || slices <= 0) return;
    try {
      await createProduction.mutateAsync({
        recipe_id: recipe.id, operator_id: user.id,
        weight_produced_g: weightG, slices_generated: slices, total_cost: totalCost,
      });
      toast.success(`${slices} fatias de ${recipe.name} registradas!`);
      setSelectedRecipeId('');
      setWeightKg('');
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar produção'); }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produção</h1>
          <p className="text-muted-foreground mt-1">Registrar produção do dia</p>
        </div>

        <Card className="card-premium gradient-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-primary" />
              Nova Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {recipesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !recipes?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cadastre receitas primeiro.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Receita</Label>
                    <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Selecione a receita" /></SelectTrigger>
                      <SelectContent>
                        {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso produzido (kg)</Label>
                    <Input id="weight" type="number" step="0.1" min="0" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Ex: 3.2" className="h-11" />
                  </div>
                </div>

                {/* Receipt-style preview */}
                {recipe && slices > 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 space-y-4 animate-scale-in">
                    <div className="text-center border-b border-dashed border-border pb-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Prévia da Produção</p>
                      <p className="text-lg font-bold mt-1">{recipe.name}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: Layers, label: 'Fatias', value: String(slices) },
                        { icon: DollarSign, label: 'Custo total', value: `R$ ${totalCost.toFixed(2)}` },
                        { icon: DollarSign, label: 'Custo/fatia', value: `R$ ${costPerUnit.toFixed(2)}` },
                        { icon: TrendingUp, label: 'Margem/fatia', value: `R$ ${marginPerSlice.toFixed(2)}`, color: marginPerSlice > 0 },
                      ].map(stat => (
                        <div key={stat.label} className="text-center">
                          <div className="flex justify-center mb-1">
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                          <p className={`text-lg font-bold font-mono-numbers ${stat.color !== undefined ? (stat.color ? 'text-success' : 'text-destructive') : ''}`}>
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Visual slice bar */}
                    <div className="flex gap-0.5 justify-center flex-wrap">
                      {Array.from({ length: Math.min(slices, 40) }).map((_, i) => (
                        <div key={i} className="h-3 w-3 rounded-sm bg-primary/20 animate-scale-in" style={{ animationDelay: `${i * 20}ms` }} />
                      ))}
                      {slices > 40 && <span className="text-xs text-muted-foreground ml-1">+{slices - 40}</span>}
                    </div>
                  </div>
                )}

                <Button onClick={handleSubmit} disabled={!recipe || slices <= 0 || createProduction.isPending}
                  className="w-full md:w-auto h-11 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                  {createProduction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Produção
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's history as timeline */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Produção de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {prodsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !productions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma produção registrada hoje.</p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                {productions.map((p: any) => (
                  <div key={p.id} className="relative flex items-start gap-4 py-3 pl-1">
                    <div className="relative z-10 h-[10px] w-[10px] rounded-full mt-1.5 bg-accent ring-4 ring-background" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{p.recipes?.name ?? '—'}</span>
                        <Badge variant="secondary" className="text-xs">{p.slices_generated} fatias</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.produced_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{Number(p.weight_produced_g).toLocaleString()}g</span>
                        <span className="font-mono-numbers">R$ {Number(p.total_cost).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Production;
