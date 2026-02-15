import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Power, PowerOff, Trash2 } from 'lucide-react';
import type { Recipe } from '@/hooks/useRecipes';
import { useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes';
import RecipeForm from './RecipeForm';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = {
  bolo: 'Bolo', torta: 'Torta', salgado: 'Salgado',
  bebida: 'Bebida', doce: 'Doce', outro: 'Outro',
};

const categoryGradients: Record<string, string> = {
  bolo: 'linear-gradient(135deg, hsl(330 60% 50% / 0.12), hsl(330 60% 50% / 0.04))',
  torta: 'linear-gradient(135deg, hsl(24 80% 50% / 0.12), hsl(24 80% 50% / 0.04))',
  salgado: 'linear-gradient(135deg, hsl(38 80% 50% / 0.12), hsl(38 80% 50% / 0.04))',
  bebida: 'linear-gradient(135deg, hsl(210 70% 50% / 0.12), hsl(210 70% 50% / 0.04))',
  doce: 'linear-gradient(135deg, hsl(280 60% 50% / 0.12), hsl(280 60% 50% / 0.04))',
  outro: 'linear-gradient(135deg, hsl(0 0% 50% / 0.12), hsl(0 0% 50% / 0.04))',
};

export default function RecipeCard({ recipe, index = 0, readOnly = false }: { recipe: Recipe; index?: number; readOnly?: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const handleDelete = async () => {
    try {
      await deleteRecipe.mutateAsync(recipe.id);
      toast.success('Produto excluído');
    } catch { toast.error('Erro ao excluir produto'); }
  };

  const toggleActive = async () => {
    try {
      await updateRecipe.mutateAsync({ id: recipe.id, active: !recipe.active });
      toast.success(recipe.active ? 'Produto desativado' : 'Produto ativado');
    } catch { toast.error('Erro ao alterar status'); }
  };

  const cost = recipe.direct_cost ? Number(recipe.direct_cost) : 0;
  const price = Number(recipe.sale_price);
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  return (
    <>
      <div className={`card-cinematic shine-effect gradient-border rounded-xl opacity-0 animate-fade-in ${!recipe.active ? 'opacity-50' : ''}`}
        style={{ animationDelay: `${index * 60}ms` }}>
        <div className="p-5 space-y-4 relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-base">{recipe.name}</h3>
              <Badge variant="secondary" className="text-[10px] mt-1.5"
                style={{ background: categoryGradients[recipe.category] ?? categoryGradients.outro }}>
                {categoryLabels[recipe.category]}
              </Badge>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)} className="h-8 w-8 hover:bg-accent/10 transition-all duration-300">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={toggleActive} className="h-8 w-8 hover:bg-accent/10 transition-all duration-300">
                  {recipe.active ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-success" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 transition-all duration-300">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-border/30">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir produto</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza que deseja excluir "{recipe.name}"? Essa ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Margin visual bar */}
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, margin)}%`,
                background: margin > 30 ? 'linear-gradient(90deg, hsl(142 60% 45%), hsl(142 60% 35%))' : margin > 0 ? 'linear-gradient(90deg, hsl(38 92% 50%), hsl(38 92% 40%))' : 'hsl(0 72% 51%)',
              }} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Preço', value: `R$ ${price.toFixed(2)}` },
              { label: 'Custo', value: `R$ ${cost.toFixed(2)}` },
              { label: 'Margem', value: `${margin.toFixed(0)}%`, color: margin > 30 ? 'text-success' : margin > 0 ? 'text-warning' : 'text-destructive' },
            ].map(stat => (
              <div key={stat.label} className="glass rounded-lg p-2 text-center">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{stat.label}</p>
                <p className={`font-mono-numbers font-semibold text-sm ${stat.color ?? ''}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground/70 pt-1">
            <span>
              {(recipe as any).sell_mode === 'inteiro' && (recipe as any).weight_kg
                ? `${Number((recipe as any).weight_kg)} Kg`
                : `Fatia: ${Number(recipe.slice_weight_g)}g`}
            </span>
            <span>Est. mín: {recipe.min_stock}</span>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md glass-card depth-shadow border-shine">
          <DialogHeader><DialogTitle>Editar Produto</DialogTitle></DialogHeader>
          <RecipeForm recipe={recipe} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
