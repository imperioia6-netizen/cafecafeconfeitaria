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

const categoryGradients: Record<string, string> = {
  bolo: 'from-pink-500/10 to-pink-500/5',
  torta: 'from-orange-500/10 to-orange-500/5',
  salgado: 'from-amber-500/10 to-amber-500/5',
  bebida: 'from-blue-500/10 to-blue-500/5',
  doce: 'from-purple-500/10 to-purple-500/5',
  outro: 'from-gray-500/10 to-gray-500/5',
};

export default function RecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const [editOpen, setEditOpen] = useState(false);
  const updateRecipe = useUpdateRecipe();

  const toggleActive = async () => {
    try {
      await updateRecipe.mutateAsync({ id: recipe.id, active: !recipe.active });
      toast.success(recipe.active ? 'Receita desativada' : 'Receita ativada');
    } catch { toast.error('Erro ao alterar status'); }
  };

  const cost = recipe.direct_cost ? Number(recipe.direct_cost) : 0;
  const price = Number(recipe.sale_price);
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  return (
    <>
      <Card className={`card-premium gradient-border opacity-0 animate-fade-in ${!recipe.active ? 'opacity-60' : ''}`}
        style={{ animationDelay: `${index * 60}ms` }}>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-base">{recipe.name}</h3>
              <Badge variant="secondary" className={`text-[10px] mt-1.5 bg-gradient-to-r ${categoryGradients[recipe.category] ?? ''}`}>
                {categoryLabels[recipe.category]}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)} className="h-8 w-8 hover:bg-muted">
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={toggleActive} className="h-8 w-8 hover:bg-muted">
                {recipe.active ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-success" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Preço', value: `R$ ${price.toFixed(2)}` },
              { label: 'Custo', value: `R$ ${cost.toFixed(2)}` },
              { label: 'Margem', value: `${margin.toFixed(0)}%`, color: margin > 30 ? 'text-success' : margin > 0 ? 'text-warning' : 'text-destructive' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{stat.label}</p>
                <p className={`font-mono-numbers font-semibold text-sm ${stat.color ?? ''}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
            <span>Fatia: {Number(recipe.slice_weight_g)}g</span>
            <span>Est. mín: {recipe.min_stock}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md glass-strong">
          <DialogHeader><DialogTitle>Editar Receita</DialogTitle></DialogHeader>
          <RecipeForm recipe={recipe} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
