import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Power, PowerOff } from 'lucide-react';
import type { Recipe } from '@/hooks/useRecipes';
import { useUpdateRecipe } from '@/hooks/useRecipes';
import RecipeForm from './RecipeForm';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = {
  bolo: 'Bolo', torta: 'Torta', salgado: 'Salgado',
  bebida: 'Bebida', doce: 'Doce', outro: 'Outro',
};

const categoryColors: Record<string, string> = {
  bolo: 'bg-pink-100 text-pink-800',
  torta: 'bg-orange-100 text-orange-800',
  salgado: 'bg-amber-100 text-amber-800',
  bebida: 'bg-blue-100 text-blue-800',
  doce: 'bg-purple-100 text-purple-800',
  outro: 'bg-gray-100 text-gray-800',
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [editOpen, setEditOpen] = useState(false);
  const updateRecipe = useUpdateRecipe();

  const toggleActive = async () => {
    try {
      await updateRecipe.mutateAsync({ id: recipe.id, active: !recipe.active });
      toast.success(recipe.active ? 'Receita desativada' : 'Receita ativada');
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const cost = recipe.direct_cost ? Number(recipe.direct_cost) : 0;
  const price = Number(recipe.sale_price);
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${!recipe.active ? 'opacity-60' : ''}`}>
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-base">{recipe.name}</h3>
              <Badge variant="secondary" className={`text-xs mt-1 ${categoryColors[recipe.category] ?? ''}`}>
                {categoryLabels[recipe.category]}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)} className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={toggleActive} className="h-8 w-8">
                {recipe.active ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-green-600" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Preço</p>
              <p className="font-mono font-semibold">R$ {price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Custo</p>
              <p className="font-mono font-semibold">R$ {cost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Margem</p>
              <p className={`font-mono font-semibold ${margin > 30 ? 'text-green-600' : margin > 0 ? 'text-amber-600' : 'text-destructive'}`}>
                {margin.toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Fatia: {Number(recipe.slice_weight_g)}g</span>
            <span>Est. mín: {recipe.min_stock}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          <RecipeForm recipe={recipe} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
