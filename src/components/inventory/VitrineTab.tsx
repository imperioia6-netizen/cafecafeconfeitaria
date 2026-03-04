import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Loader2, Trash2, Clock } from 'lucide-react';
import { useInventory, useDiscardInventory, type InventoryItem } from '@/hooks/useInventory';
import { toast } from 'sonner';

function getStockAge(producedAt: string) {
  return (Date.now() - new Date(producedAt).getTime()) / (1000 * 60 * 60);
}

function StockStatusBadge({ hours }: { hours: number }) {
  if (hours > 12) return <Badge variant="destructive" className="animate-glow-pulse glow-destructive">Crítico</Badge>;
  if (hours > 8) return <Badge className="bg-warning/15 text-warning border border-warning/30">Atenção</Badge>;
  return <Badge className="bg-success/15 text-success border border-success/30 glow-success">Normal</Badge>;
}

function LifeBar({ hours }: { hours: number }) {
  const pct = Math.min(100, (hours / 12) * 100);
  const isCritical = hours > 12;
  return (
    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'animate-glow-pulse' : ''}`}
        style={{
          width: `${pct}%`,
          background: hours > 12
            ? 'linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 40%))'
            : hours > 8
              ? 'linear-gradient(90deg, hsl(38 92% 50%), hsl(38 92% 40%))'
              : 'linear-gradient(90deg, hsl(142 60% 45%), hsl(142 60% 35%))',
          boxShadow: isCritical ? '0 0 8px hsl(0 72% 51% / 0.4)' : undefined,
        }}
      />
    </div>
  );
}

export default function VitrineTab() {
  const { data: inventory, isLoading } = useInventory();
  const discardMutation = useDiscardInventory();
  const [filter, setFilter] = useState('all');

  const filtered = inventory?.filter(item => {
    if (filter === 'all') return true;
    const hours = getStockAge(item.produced_at);
    if (filter === 'critico') return hours > 12;
    if (filter === 'atencao') return hours > 8 && hours <= 12;
    if (filter === 'normal') return hours <= 8;
    return true;
  });

  const handleDiscard = async (item: InventoryItem) => {
    try {
      await discardMutation.mutateAsync(item.id);
      toast.success('Item descartado');
    } catch { toast.error('Erro ao descartar'); }
  };

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'normal', label: 'Normal' },
    { key: 'atencao', label: 'Atenção' },
    { key: 'critico', label: 'Crítico' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
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

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum produto na vitrine.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => {
            const hours = getStockAge(item.produced_at);
            const isCritical = hours > 12;
            const stockGrams = Number((item as any).stock_grams) || 0;
            const r = item.recipes as any;
            const sliceWeight = Number(r?.slice_weight_grams) || 250;
            const wholeWeight = Number(r?.whole_weight_grams) || 0;
            const sellsSlice = r?.sells_slice ?? true;
            const sellsWhole = r?.sells_whole ?? false;
            const availableSlices = sellsSlice && sliceWeight > 0 ? Math.floor(stockGrams / sliceWeight) : 0;
            const availableWhole = sellsWhole && wholeWeight > 0 ? Math.floor(stockGrams / wholeWeight) : 0;

            return (
              <div
                key={item.id}
                className="card-cinematic rounded-xl opacity-0 animate-fade-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  borderColor: isCritical ? 'hsl(0 72% 51% / 0.3)' : undefined,
                  boxShadow: isCritical ? '0 0 20px hsl(0 72% 51% / 0.08), inset 0 0 20px hsl(0 72% 51% / 0.03)' : undefined,
                }}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{item.recipes?.name ?? '—'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.produced_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <StockStatusBadge hours={hours} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground/70">Estoque</p>
                      <p className="text-2xl font-extrabold font-mono-numbers">{stockGrams.toLocaleString('pt-BR')}g</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground/70">Tempo</p>
                      <p className="text-lg font-semibold font-mono-numbers">{hours.toFixed(1)}h</p>
                    </div>
                  </div>

                  {/* Available units */}
                  <div className="flex gap-3 text-xs">
                    {sellsSlice && (
                      <Badge variant="secondary" className="text-[10px]">
                        {availableSlices} fatia{availableSlices !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {sellsWhole && (
                      <Badge variant="secondary" className="text-[10px]">
                        {availableWhole} inteiro{availableWhole !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <LifeBar hours={hours} />

                  {isCritical && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDiscard(item)}
                      disabled={discardMutation.isPending}
                      className="w-full shine-effect"
                      style={{ background: 'linear-gradient(135deg, hsl(0 72% 51%), hsl(0 72% 40%))' }}
                    >
                      <span className="relative z-10 flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Descartar
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
