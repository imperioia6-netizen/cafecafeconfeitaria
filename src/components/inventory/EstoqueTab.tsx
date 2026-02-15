import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBasket, Plus, Minus, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { useIngredientStock, useAddIngredient, useUpdateIngredientStock } from '@/hooks/useIngredientStock';
import { toast } from 'sonner';

function StockBar({ current, min }: { current: number; min: number }) {
  if (min <= 0) return null;
  const pct = Math.min(100, (current / (min * 3)) * 100);
  const isLow = current <= min;
  return (
    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isLow ? 'animate-glow-pulse' : ''}`}
        style={{
          width: `${pct}%`,
          background: isLow
            ? 'linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 40%))'
            : current <= min * 1.5
              ? 'linear-gradient(90deg, hsl(38 92% 50%), hsl(38 92% 40%))'
              : 'linear-gradient(90deg, hsl(142 60% 45%), hsl(142 60% 35%))',
        }}
      />
    </div>
  );
}

export default function EstoqueTab() {
  const { data: ingredients, isLoading } = useIngredientStock();
  const addMutation = useAddIngredient();
  const updateMutation = useUpdateIngredientStock();
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'kg', price_per_unit: '', stock_quantity: '', min_stock: '', expiry_date: '' });

  const filtered = ingredients?.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'baixo') return item.min_stock > 0 && item.stock_quantity <= item.min_stock;
    if (filter === 'vencendo') {
      if (!item.expiry_date) return false;
      const days = (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 7 && days >= 0;
    }
    return true;
  });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    try {
      await addMutation.mutateAsync({
        name: form.name.trim(),
        unit: form.unit,
        price_per_unit: Number(form.price_per_unit) || 0,
        stock_quantity: Number(form.stock_quantity) || 0,
        min_stock: Number(form.min_stock) || 0,
        expiry_date: form.expiry_date || null,
      });
      toast.success('Ingrediente adicionado');
      setForm({ name: '', unit: 'kg', price_per_unit: '', stock_quantity: '', min_stock: '', expiry_date: '' });
      setDialogOpen(false);
    } catch { toast.error('Erro ao adicionar'); }
  };

  const handleQtyChange = async (id: string, current: number, delta: number) => {
    const newQty = Math.max(0, current + delta);
    try {
      await updateMutation.mutateAsync({ id, stock_quantity: newQty });
    } catch { toast.error('Erro ao atualizar'); }
  };

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'baixo', label: 'Baixo Estoque' },
    { key: 'vencendo', label: 'Vencendo' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto no-scrollbar mobile-tabs">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-500 ${
                filter === f.key
                  ? 'text-primary-foreground depth-shadow scale-105'
                  : 'text-muted-foreground hover:bg-muted/60'
              }`}
              style={filter === f.key ? {
                background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
              } : { background: 'hsl(var(--muted) / 0.5)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shine-effect" style={{ background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' }}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card depth-shadow border-shine">
            <DialogHeader><DialogTitle>Novo Ingrediente</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Farinha de trigo" className="input-glow" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="un">un</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Preço/{form.unit}</Label><Input type="number" value={form.price_per_unit} onChange={e => setForm(p => ({ ...p, price_per_unit: e.target.value }))} placeholder="0.00" className="input-glow" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade</Label><Input type="number" value={form.stock_quantity} onChange={e => setForm(p => ({ ...p, stock_quantity: e.target.value }))} placeholder="0" className="input-glow" /></div>
                <div><Label>Estoque Mínimo</Label><Input type="number" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: e.target.value }))} placeholder="0" className="input-glow" /></div>
              </div>
              <div><Label>Validade</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className="input-glow" /></div>
              <Button onClick={handleAdd} disabled={!form.name.trim() || addMutation.isPending} className="w-full h-11 shine-effect" style={{ background: 'linear-gradient(135deg, hsl(142 60% 40%), hsl(142 60% 35%))' }}>
                <span className="relative z-10 flex items-center gap-2">
                  {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <ShoppingBasket className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum ingrediente encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => {
            const isLow = item.min_stock > 0 && item.stock_quantity <= item.min_stock;
            const daysToExpiry = item.expiry_date ? (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : null;
            const isExpiring = daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry >= 0;
            const isExpired = daysToExpiry !== null && daysToExpiry < 0;
            return (
              <div
                key={item.id}
                className="card-cinematic rounded-xl opacity-0 animate-fade-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  borderColor: isLow || isExpired ? 'hsl(0 72% 51% / 0.3)' : undefined,
                  boxShadow: isLow || isExpired ? '0 0 20px hsl(0 72% 51% / 0.08), inset 0 0 20px hsl(0 72% 51% / 0.03)' : undefined,
                }}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{item.name}</h3>
                      <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {isLow && <Badge variant="destructive" className="text-[10px] glow-destructive">Baixo</Badge>}
                      {isExpired && <Badge variant="destructive" className="text-[10px] glow-destructive">Vencido</Badge>}
                      {isExpiring && !isExpired && <Badge className="bg-warning/15 text-warning border border-warning/30 text-[10px]">Vencendo</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground/70">Quantidade</p>
                      <p className="text-3xl font-extrabold font-mono-numbers">{item.stock_quantity}</p>
                    </div>
                    {item.min_stock > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground/70">Mínimo</p>
                        <p className="text-lg font-semibold font-mono-numbers">{item.min_stock}</p>
                      </div>
                    )}
                  </div>

                  <StockBar current={item.stock_quantity} min={item.min_stock} />

                  {item.expiry_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <Calendar className="h-3 w-3" />
                      <span>Validade: {new Date(item.expiry_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}

                    <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleQtyChange(item.id, item.stock_quantity, -1)} disabled={item.stock_quantity <= 0 || updateMutation.isPending}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleQtyChange(item.id, item.stock_quantity, 1)} disabled={updateMutation.isPending}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
