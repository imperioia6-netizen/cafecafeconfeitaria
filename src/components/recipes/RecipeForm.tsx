import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Camera, X, Loader2 } from 'lucide-react';
import { useCreateRecipe, useUpdateRecipe, type Recipe, type RecipeInsert } from '@/hooks/useRecipes';
import { Constants } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  category: z.enum(['bolo', 'torta', 'salgado', 'bebida', 'doce', 'outro']),
  slice_weight_g: z.coerce.number().optional(),
  sale_price: z.coerce.number().min(0.01, 'Preço obrigatório'),
  direct_cost: z.coerce.number().min(0).nullable(),
}).superRefine((data, ctx) => {
  if (data.category === 'bolo' && (!data.slice_weight_g || data.slice_weight_g < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Peso por fatia obrigatório para bolos',
      path: ['slice_weight_g'],
    });
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

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: recipe ? {
      name: recipe.name,
      category: recipe.category,
      slice_weight_g: recipe.category === 'bolo' ? Number(recipe.slice_weight_g) : undefined,
      sale_price: Number(recipe.sale_price),
      direct_cost: recipe.direct_cost ? Number(recipe.direct_cost) : null,
    } : {
      name: '',
      category: 'bolo',
      slice_weight_g: 250,
      sale_price: 0,
      direct_cost: null,
    },
  });

  const category = watch('category');
  const isBolo = category === 'bolo';
  const directCost = watch('direct_cost');
  const salePrice = watch('sale_price');

  const costPerSlice = directCost ?? 0;
  const marginPerSlice = salePrice - costPerSlice;
  const marginPercent = salePrice > 0 ? (marginPerSlice / salePrice) * 100 : 0;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhoto = async (recipeId: string): Promise<string | null> => {
    if (!photoFile) return photoPreview; // keep existing
    const ext = photoFile.name.split('.').pop();
    const path = `${recipeId}.${ext}`;
    const { error } = await supabase.storage
      .from('product-photos')
      .upload(path, photoFile, { upsert: true });
    if (error) throw new Error('Erro ao enviar foto: ' + error.message);
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setUploading(true);
      const payload = {
        ...data,
        slice_weight_g: data.category === 'bolo' ? (data.slice_weight_g ?? 250) : 250,
        min_stock: 0,
      };

      if (isEdit && recipe) {
        const photo_url = await uploadPhoto(recipe.id);
        await updateRecipe.mutateAsync({ id: recipe.id, ...payload, photo_url });
        toast.success('Receita atualizada!');
        onClose?.();
      } else {
        const created = await createRecipe.mutateAsync(payload as RecipeInsert);
        const photo_url = await uploadPhoto(created.id);
        if (photo_url) {
          await updateRecipe.mutateAsync({ id: created.id, photo_url });
        }
        toast.success('Receita criada!');
        reset();
        setPhotoFile(null);
        setPhotoPreview(null);
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar receita');
    } finally {
      setUploading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Photo upload */}
      <div className="flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Preview"
              className="h-24 w-24 rounded-xl object-cover border border-border"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
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

      {isBolo ? (
        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="slice_weight_g">Peso por fatia (g)</Label>
            <Input id="slice_weight_g" type="number" {...register('slice_weight_g')} />
            {errors.slice_weight_g && <p className="text-xs text-destructive">{errors.slice_weight_g.message}</p>}
          </div>
        </div>
      ) : (
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
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sale_price">Preço de venda (R$)</Label>
          <Input id="sale_price" type="number" step="0.01" {...register('sale_price')} />
          {errors.sale_price && <p className="text-xs text-destructive">{errors.sale_price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="direct_cost">Custo direto (R$)</Label>
          <Input id="direct_cost" type="number" step="0.01" {...register('direct_cost')} placeholder="Custo total" />
        </div>
      </div>

      {salePrice > 0 && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-1">
          <p className="text-sm font-medium text-foreground">Cálculo em tempo real</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Custo {isBolo ? 'por fatia' : 'unitário'}:</span>
            <span className="font-mono font-medium">R$ {costPerSlice.toFixed(2)}</span>
            <span className="text-muted-foreground">Margem {isBolo ? 'por fatia' : 'unitária'}:</span>
            <span className="font-mono font-medium">R$ {marginPerSlice.toFixed(2)}</span>
            <span className="text-muted-foreground">Margem %:</span>
            <span className={`font-mono font-medium ${marginPercent > 0 ? 'text-green-600' : 'text-destructive'}`}>
              {marginPercent.toFixed(1)}%
            </span>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
