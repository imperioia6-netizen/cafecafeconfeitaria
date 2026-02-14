import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Loader2, Trash2, Clock } from 'lucide-react';
import { useInventory, useDiscardInventory, type InventoryItem } from '@/hooks/useInventory';
import { toast } from 'sonner';

function getStockAge(producedAt: string) {
  return (Date.now() - new Date(producedAt).getTime()) / (1000 * 60 * 60);
}

function StockStatusBadge({ hours }: { hours: number }) {
  if (hours > 12) return <Badge variant="destructive" className="animate-glow-pulse">Crítico</Badge>;
  if (hours > 8) return <Badge className="bg-warning/15 text-warning border border-warning/30">Atenção</Badge>;
  return <Badge className="bg-success/15 text-success border border-success/30">Normal</Badge>;
}

function LifeBar({ hours }: { hours: number }) {
  const pct = Math.min(100, (hours / 12) * 100);
  const color = hours > 12 ? 'bg-destructive' : hours > 8 ? 'bg-warning' : 'bg-success';
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const Inventory = () => {
  const { data: inventory, isLoading } = useInventory();
  const discardMutation = useDiscardInventory();
  const [filter, setFilter] = useState<string>('all');

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
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
            <p className="text-muted-foreground mt-1">Controle em tempo real — {filtered?.length ?? 0} itens</p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum produto em estoque.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, i) => {
              const hours = getStockAge(item.produced_at);
              return (
                <Card
                  key={item.id}
                  className={`card-premium opacity-0 animate-fade-in ${hours > 12 ? 'border-destructive/30' : ''}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="pt-5 pb-4 space-y-3">
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
                        <p className="text-xs text-muted-foreground">Fatias</p>
                        <p className="text-2xl font-bold font-mono-numbers">{item.slices_available}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Tempo</p>
                        <p className="text-lg font-semibold font-mono-numbers">{hours.toFixed(1)}h</p>
                      </div>
                    </div>

                    <LifeBar hours={hours} />

                    {hours > 12 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDiscard(item)}
                        disabled={discardMutation.isPending}
                        className="w-full bg-gradient-to-r from-destructive to-destructive/80"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Descartar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Inventory;
