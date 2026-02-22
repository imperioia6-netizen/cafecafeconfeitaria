import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Camera, X, Loader2 } from 'lucide-react';
import { useCreateRecipe, useUpdateRecipe, type Recipe, type RecipeInsert } from '@/hooks/useRecipes';
import { Constants } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  category: z.enum(['bolo', 'torta', 'salgado', 'bebida', 'doce', 'outro']),
  sells_whole: z.boolean(),
  sells_slice: z.boolean(),
  whole_weight_grams: z.coerce.number().optional().nullable(),
  slice_weight_grams: z.coerce.number().optional().nullable(),
  whole_price: z.coerce.number().optional().nullable(),
  slice_price: z.coerce.number().optional().nullable(),
  direct_cost: z.coerce.number().min(0).nullable(),
  recipe_total_weight_grams: z.coerce.number().optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.sells_whole && !data.sells_slice) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pelo menos um modo de venda deve estar ativo', path: ['sells_slice'] });
  }
  if (data.sells_whole) {
    if (!data.whole_weight_grams || data.whole_weight_grams < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Peso do inteiro obrigatório', path: ['whole_weight_grams'] });
    }
    if (!data.whole_price || data.whole_price < 0.01) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Preço do inteiro obrigatório', path: ['whole_price'] });
    }
  }
  if (data.sells_slice) {
    if (!data.slice_weight_grams || data.slice_weight_grams < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Peso da fatia obrigatório', path: ['slice_weight_grams'] });
    }
    if (!data.slice_price || data.slice_price < 0.01) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Preço da fatia obrigatório', path: ['slice_price'] });
    }
  }
  if (data.direct_cost && data.direct_cost > 0) {
    if (!data.recipe_total_weight_grams || data.recipe_total_weight_grams < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Peso total da receita obrigatório quando custo é informado', path: ['recipe_total_weight_grams'] });
    }
  }
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(recipe?.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const isEdit = !!recipe;

  const r = recipe as any;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: recipe ? {
      name: recipe.name,
      description: (recipe as any).description || '',
      category: recipe.category,
      sells_whole: r.sells_whole ?? false,
      sells_slice: r.sells_slice ?? true,
      whole_weight_grams: r.whole_weight_grams ? Number(r.whole_weight_grams) : null,
      slice_weight_grams: r.slice_weight_grams ? Number(r.slice_weight_grams) : (Number(recipe.slice_weight_g) || 250),
      whole_price: r.whole_price ? Number(r.whole_price) : null,
      slice_price: r.slice_price ? Number(r.slice_price) : Number(recipe.sale_price),
      direct_cost: recipe.direct_cost ? Number(recipe.direct_cost) : null,
      recipe_total_weight_grams: r.whole_weight_grams ? Number(r.whole_weight_grams) : null,
    } : {
      name: '',
      description: '',
      category: 'bolo',
      sells_whole: false,
      sells_slice: true,
      whole_weight_grams: null,
      slice_weight_grams: 250,
      whole_price: null,
      slice_price: 0,
      direct_cost: null,
      recipe_total_weight_grams: null,
    },
  });

  const category = watch('category');
  const sellsWhole = watch('sells_whole');
  const sellsSlice = watch('sells_slice');
  const directCost = watch('direct_cost');
  const wholeWeightGrams = watch('whole_weight_grams');
  const sliceWeightGrams = watch('slice_weight_grams');
  const wholePrice = watch('whole_price');
  const slicePrice = watch('slice_price');

  const recipeTotalWeight = watch('recipe_total_weight_grams');

  const costNum = Number(directCost) || 0;
  const recipeWeightNum = Number(recipeTotalWeight) || 0;
  const wholeWeightNum = Number(wholeWeightGrams) || 0;
  const sliceWeightNum = Number(sliceWeightGrams) || 0;
  const costPerGram = recipeWeightNum > 0 ? costNum / recipeWeightNum : 0;

  const wholePriceNum = Number(wholePrice) || 0;
  const slicePriceNum = Number(slicePrice) || 0;
  const wholeCost = costPerGram * wholeWeightNum;
  const sliceCost = costPerGram * sliceWeightNum;
  const wholeMargin = wholePriceNum > 0 ? ((wholePriceNum - wholeCost) / wholePriceNum) * 100 : 0;
  const sliceMargin = slicePriceNum > 0 ? ((slicePriceNum - sliceCost) / slicePriceNum) * 100 : 0;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhoto = async (recipeId: string): Promise<string | null> => {
    if (!photoFile) return photoPreview;
    const ext = photoFile.name.split('.').pop();
    const path = `${recipeId}.${ext}`;
    const { error } = await supabase.storage.from('product-photos').upload(path, photoFile, { upsert: true });
    if (error) throw new Error('Erro ao enviar foto: ' + error.message);
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setUploading(true);

      // Compute sale_price as the minimum active price (for backward compat)
      const prices: number[] = [];
      if (data.sells_whole && data.whole_price) prices.push(data.whole_price);
      if (data.sells_slice && data.slice_price) prices.push(data.slice_price);
      const salePrice = prices.length > 0 ? Math.min(...prices) : 0;

      const recipeWeight = Number(data.recipe_total_weight_grams) || 0;
      const cpg = recipeWeight > 0 ? costNum / recipeWeight : null;

      const payload: any = {
        name: data.name,
        description: data.description || null,
        category: data.category,
        sells_whole: data.sells_whole,
        sells_slice: data.sells_slice,
        whole_weight_grams: data.sells_whole ? data.whole_weight_grams : (data.recipe_total_weight_grams || null),
        slice_weight_grams: data.sells_slice ? data.slice_weight_grams : 250,
        whole_price: data.sells_whole ? data.whole_price : null,
        slice_price: data.sells_slice ? data.slice_price : null,
        direct_cost: data.direct_cost,
        cost_per_gram: cpg,
        // Backward compat fields
        sale_price: salePrice,
        sell_mode: data.sells_whole && !data.sells_slice ? 'inteiro' : 'fatia',
        slice_weight_g: data.sells_slice ? data.slice_weight_grams : 250,
        weight_kg: data.sells_whole && data.whole_weight_grams ? data.whole_weight_grams / 1000 : null,
        min_stock: 0,
      };

      if (isEdit && recipe) {
        const photo_url = await uploadPhoto(recipe.id);
        await updateRecipe.mutateAsync({ id: recipe.id, ...payload, photo_url });
        toast.success('Produto atualizado!');
        onClose?.();
      } else {
        const created = await createRecipe.mutateAsync(payload as RecipeInsert);
        const photo_url = await uploadPhoto(created.id);
        if (photo_url) await updateRecipe.mutateAsync({ id: created.id, photo_url });
        toast.success('Produto criado!');
        reset();
        setPhotoFile(null);
        setPhotoPreview(null);
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar produto');
    } finally {
      setUploading(false);
    }
  };

  const isBolo = category === 'bolo';

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Photo upload */}
      <div className="flex flex-col items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="Preview" className="h-24 w-24 rounded-xl object-cover border border-border" />
            <button type="button" onClick={removePhoto} className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
            <Camera className="h-6 w-6" />
            <span className="text-[10px] font-medium">Adicionar foto</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Produto</Label>
        <Input id="name" {...register('name')} placeholder="Ex: Bolo de Chocolate" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição do Produto</Label>
        <Textarea id="description" {...register('description')} placeholder="Ex: Bolo de chocolate belga com cobertura de ganache..." className="resize-none min-h-[70px]" maxLength={500} />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select defaultValue={category} onValueChange={(v: any) => setValue('category', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Constants.public.Enums.product_category.map(c => (
              <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sale mode toggles */}
      <div className="rounded-lg border border-border/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Modos de Venda</p>
        <div className="flex items-center justify-between">
          <Label htmlFor="sells_whole" className="text-sm">Vende Inteiro</Label>
          <Switch id="sells_whole" checked={sellsWhole} onCheckedChange={v => setValue('sells_whole', v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sells_slice" className="text-sm">Vende Fatia / Unidade</Label>
          <Switch id="sells_slice" checked={sellsSlice} onCheckedChange={v => setValue('sells_slice', v)} />
        </div>
        {errors.sells_slice && <p className="text-xs text-destructive">{errors.sells_slice.message}</p>}
      </div>

      {/* Whole fields */}
      {sellsWhole && (
        <div className="rounded-lg border border-border/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inteiro</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Peso (g)</Label>
              <Input type="number" {...register('whole_weight_grams')} placeholder="3000" />
              {errors.whole_weight_grams && <p className="text-xs text-destructive">{errors.whole_weight_grams.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço (R$)</Label>
              <Input type="number" step="0.01" {...register('whole_price')} placeholder="120.00" />
              {errors.whole_price && <p className="text-xs text-destructive">{errors.whole_price.message}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Slice fields */}
      {sellsSlice && (
        <div className="rounded-lg border border-border/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isBolo ? 'Fatia' : 'Unidade'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Peso (g)</Label>
              <Input type="number" {...register('slice_weight_grams')} placeholder="250" />
              {errors.slice_weight_grams && <p className="text-xs text-destructive">{errors.slice_weight_grams.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço (R$)</Label>
              <Input type="number" step="0.01" {...register('slice_price')} placeholder="15.00" />
              {errors.slice_price && <p className="text-xs text-destructive">{errors.slice_price.message}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Cost */}
      <div className="rounded-lg border border-border/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Custo da Receita</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Custo total (R$)</Label>
            <Input type="number" step="0.01" {...register('direct_cost')} placeholder="90.00" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Peso total da receita (g)</Label>
            <Input type="number" {...register('recipe_total_weight_grams')} placeholder="3000" />
            {errors.recipe_total_weight_grams && <p className="text-xs text-destructive">{errors.recipe_total_weight_grams.message}</p>}
          </div>
        </div>
      </div>

      {/* Margin panel */}
      {(sellsWhole || sellsSlice) && costNum > 0 && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Cálculo de Margem</p>
          {costPerGram > 0 && (
            <p className="text-xs text-muted-foreground">Custo/g: <span className="font-mono font-medium">R$ {costPerGram.toFixed(4)}</span></p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {sellsWhole && wholePriceNum > 0 && (
              <div className="glass rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inteiro</p>
                <p className="text-xs text-muted-foreground">Custo: R$ {wholeCost.toFixed(2)}</p>
                <p className={`font-mono font-semibold text-sm ${wholeMargin > 30 ? 'text-success' : wholeMargin > 0 ? 'text-warning' : 'text-destructive'}`}>
                  {wholeMargin.toFixed(1)}%
                </p>
              </div>
            )}
            {sellsSlice && slicePriceNum > 0 && (
              <div className="glass rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{isBolo ? 'Fatia' : 'Unidade'}</p>
                <p className="text-xs text-muted-foreground">Custo: R$ {sliceCost.toFixed(2)}</p>
                <p className={`font-mono font-semibold text-sm ${sliceMargin > 30 ? 'text-success' : sliceMargin > 0 ? 'text-warning' : 'text-destructive'}`}>
                  {sliceMargin.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={createRecipe.isPending || updateRecipe.isPending || uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {isEdit ? 'Salvar Alterações' : 'Criar Produto'}
      </Button>
    </form>
  );

  if (isEdit) return formContent;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Novo Produto</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
