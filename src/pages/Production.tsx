import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Coffee, Loader2 } from 'lucide-react';
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
        recipe_id: recipe.id,
        operator_id: user.id,
        weight_produced_g: weightG,
        slices_generated: slices,
        total_cost: totalCost,
      });
      toast.success(`${slices} fatias de ${recipe.name} registradas!`);
      setSelectedRecipeId('');
      setWeightKg('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar produção');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produção</h1>
          <p className="text-muted-foreground mt-1">Registrar produção do dia</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-primary" />
              Registrar Nova Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      <SelectTrigger><SelectValue placeholder="Selecione a receita" /></SelectTrigger>
                      <SelectContent>
                        {recipes.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso produzido (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      placeholder="Ex: 3.2"
                    />
                  </div>
                </div>

                {recipe && slices > 0 && (
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-sm font-medium mb-2">Prévia da produção</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Fatias</p>
                        <p className="font-mono text-lg font-bold">{slices}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Custo total</p>
                        <p className="font-mono font-semibold">R$ {totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Custo/fatia</p>
                        <p className="font-mono font-semibold">R$ {costPerUnit.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Margem/fatia</p>
                        <p className={`font-mono font-semibold ${marginPerSlice > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          R$ {marginPerSlice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!recipe || slices <= 0 || createProduction.isPending}
                  className="w-full md:w-auto"
                >
                  {createProduction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Produção
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produção de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {prodsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !productions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma produção registrada hoje.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receita</TableHead>
                    <TableHead>Peso (g)</TableHead>
                    <TableHead>Fatias</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productions.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.recipes?.name ?? '—'}</TableCell>
                      <TableCell>{Number(p.weight_produced_g).toLocaleString()}</TableCell>
                      <TableCell>{p.slices_generated}</TableCell>
                      <TableCell>R$ {Number(p.total_cost).toFixed(2)}</TableCell>
                      <TableCell>{new Date(p.produced_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Production;
