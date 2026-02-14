import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
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
          <h1 className="page-title">Produção</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Registrar produção do dia</p>
        </div>

        <div className="card-cinematic gradient-border border-shine rounded-xl">
          <div className="p-6 space-y-5">
            <h3 className="flex items-center gap-2 font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Coffee className="h-5 w-5 text-accent animate-float" />
              Nova Produção
            </h3>
            {recipesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !recipes?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cadastre produtos primeiro.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produto</Label>
                    <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                      <SelectTrigger className="h-11 input-glow"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                      <SelectContent>
                        {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso produzido (kg)</Label>
                    <Input id="weight" type="number" step="0.1" min="0" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Ex: 3.2" className="h-11 input-glow" />
                  </div>
                </div>

                {/* Receipt-style preview */}
                {recipe && slices > 0 && (
                  <div className="rounded-xl animate-scale-in space-y-4 p-6"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 30%, hsl(36 70% 50% / 0.05), hsl(var(--muted) / 0.3))',
                      border: '2px dashed hsl(var(--border) / 0.5)',
                    }}
                  >
                    <div className="text-center pb-3">
                      <div className="separator-gradient mb-3" />
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Prévia da Produção</p>
                      <p className="text-lg font-bold mt-1">{recipe.name}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: Layers, label: 'Fatias', value: String(slices) },
                        { icon: DollarSign, label: 'Custo total', value: `R$ ${totalCost.toFixed(2)}` },
                        { icon: DollarSign, label: 'Custo/fatia', value: `R$ ${costPerUnit.toFixed(2)}` },
                        { icon: TrendingUp, label: 'Margem/fatia', value: `R$ ${marginPerSlice.toFixed(2)}`, color: marginPerSlice > 0 },
                      ].map(stat => (
                        <div key={stat.label} className="text-center glass rounded-lg p-3">
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
                        <div key={i} className="h-3 w-3 rounded-sm animate-scale-in" style={{
                          animationDelay: `${i * 20}ms`,
                          background: `hsl(24 ${60 - i}% ${23 + i * 0.5}%)`,
                        }} />
                      ))}
                      {slices > 40 && <span className="text-xs text-muted-foreground ml-1">+{slices - 40}</span>}
                    </div>
                  </div>
                )}

                <Button onClick={handleSubmit} disabled={!recipe || slices <= 0 || createProduction.isPending}
                  className="w-full md:w-auto h-11 shine-effect"
                  style={{
                    background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%), hsl(24 60% 23%))',
                    boxShadow: '0 4px 20px hsl(24 60% 23% / 0.3)',
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {createProduction.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmar Produção
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Today's history */}
        <div className="card-cinematic rounded-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Produção de Hoje</h3>
            {prodsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !productions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma produção registrada hoje.</p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, hsl(36 70% 50% / 0.4), transparent)' }} />
                {productions.map((p: any) => (
                  <div key={p.id} className="relative flex items-start gap-4 py-3 pl-1 hover:translate-x-1 transition-transform duration-300">
                    <div className="relative z-10 h-[10px] w-[10px] rounded-full mt-1.5 bg-accent ring-4 ring-background"
                      style={{ boxShadow: '0 0 8px hsl(36 70% 50% / 0.3)' }} />
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Production;
