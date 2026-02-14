import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { useCreateRecipe, useUpdateRecipe, type Recipe, type RecipeInsert } from '@/hooks/useRecipes';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  category: z.enum(['bolo', 'torta', 'salgado', 'bebida', 'doce', 'outro']),
  slice_weight_g: z.coerce.number().min(1, 'Peso obrigatório'),
  sale_price: z.coerce.number().min(0.01, 'Preço obrigatório'),
  min_stock: z.coerce.number().min(0),
  direct_cost: z.coerce.number().min(0).nullable(),
});

type FormData = z.infer<typeof schema>;

const categoryLabels: Record<string, string> = {
  bolo: 'Bolo', torta: 'Torta', salgado: 'Salgado',
  bebida: 'Bebida', doce: 'Doce', outro: 'Outro',
};

interface Props {
  recipe?: Recipe | null;
  onClose?: () => void;
}

export default function RecipeForm({ recipe, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const isEdit = !!recipe;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: recipe ? {
      name: recipe.name,
      category: recipe.category,
      slice_weight_g: Number(recipe.slice_weight_g),
      sale_price: Number(recipe.sale_price),
      min_stock: recipe.min_stock,
      direct_cost: recipe.direct_cost ? Number(recipe.direct_cost) : null,
    } : {
      name: '',
      category: 'bolo',
      slice_weight_g: 250,
      sale_price: 0,
      min_stock: 5,
      direct_cost: null,
    },
  });

  const directCost = watch('direct_cost');
  const salePrice = watch('sale_price');
  const sliceWeight = watch('slice_weight_g');

  // Margin calc
  const costPerSlice = directCost && sliceWeight ? directCost : 0;
  const marginPerSlice = salePrice - costPerSlice;
  const marginPercent = salePrice > 0 ? (marginPerSlice / salePrice) * 100 : 0;

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, ...data });
        toast.success('Receita atualizada!');
        onClose?.();
      } else {
        await createRecipe.mutateAsync(data as RecipeInsert);
        toast.success('Receita criada!');
        reset();
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar receita');
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Produto</Label>
        <Input id="name" {...register('name')} placeholder="Ex: Bolo de Chocolate" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select defaultValue={watch('category')} onValueChange={(v: any) => setValue('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.product_category.map(c => (
                <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="slice_weight_g">Peso por fatia (g)</Label>
          <Input id="slice_weight_g" type="number" {...register('slice_weight_g')} />
          {errors.slice_weight_g && <p className="text-xs text-destructive">{errors.slice_weight_g.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sale_price">Preço de venda (R$)</Label>
          <Input id="sale_price" type="number" step="0.01" {...register('sale_price')} />
          {errors.sale_price && <p className="text-xs text-destructive">{errors.sale_price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_stock">Estoque mínimo</Label>
          <Input id="min_stock" type="number" {...register('min_stock')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direct_cost">Custo direto (R$)</Label>
        <Input id="direct_cost" type="number" step="0.01" {...register('direct_cost')} placeholder="Custo total para fazer" />
      </div>

      {/* Live calculations */}
      {salePrice > 0 && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-1">
          <p className="text-sm font-medium text-foreground">Cálculo em tempo real</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Custo por fatia:</span>
            <span className="font-mono font-medium">R$ {costPerSlice.toFixed(2)}</span>
            <span className="text-muted-foreground">Margem por fatia:</span>
            <span className="font-mono font-medium">R$ {marginPerSlice.toFixed(2)}</span>
            <span className="text-muted-foreground">Margem %:</span>
            <span className={`font-mono font-medium ${marginPercent > 0 ? 'text-green-600' : 'text-destructive'}`}>
              {marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={createRecipe.isPending || updateRecipe.isPending}>
        {isEdit ? 'Salvar Alterações' : 'Criar Receita'}
      </Button>
    </form>
  );

  if (isEdit) return formContent;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova Receita</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
