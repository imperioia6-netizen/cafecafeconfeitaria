import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Loader2, Trash2, Clock, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { useInventory, useDiscardInventory, type InventoryItem } from '@/hooks/useInventory';
import { useActiveAlerts, useResolveAlert, useAlertCount } from '@/hooks/useAlerts';
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

const typeLabels: Record<string, string> = { estoque_baixo: 'Estoque Baixo', validade_12h: 'Validade >12h', desperdicio: 'Desperdício', outro: 'Outro' };
const typeIcons: Record<string, React.ElementType> = { estoque_baixo: Package, validade_12h: Clock, desperdicio: Trash2, outro: HelpCircle };

function AlertsContent() {
  const { data: alerts, isLoading } = useActiveAlerts();
  const resolveAlert = useResolveAlert();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [action, setAction] = useState('');

  const handleResolve = async () => {
    if (!resolveId || !action.trim()) return;
    try {
      await resolveAlert.mutateAsync({ id: resolveId, action_taken: action.trim() });
      toast.success('Alerta resolvido');
      setResolveId(null);
      setAction('');
    } catch { toast.error('Erro ao resolver alerta'); }
  };

  return (
    <div className="card-cinematic rounded-xl">
      <div className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-lg mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          <AlertTriangle className="h-5 w-5 text-accent" />
          Timeline de Alertas
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !alerts?.length ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'hsl(142 60% 40% / 0.3)' }} />
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento ✦</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, hsl(36 70% 50% / 0.4), hsl(0 72% 51% / 0.2), transparent)' }} />
            {alerts.map((alert: any, idx: number) => {
              const TypeIcon = typeIcons[alert.alert_type] || AlertTriangle;
              const isCritical = alert.alert_type === 'validade_12h';
              return (
                <div key={alert.id}
                  className="relative flex items-start gap-4 py-4 pl-0 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className={`relative z-10 flex items-center justify-center h-10 w-10 rounded-full ring-4 ring-card`}
                    style={{
                      background: isCritical ? 'hsl(0 72% 51% / 0.12)' : 'hsl(38 92% 50% / 0.12)',
                      boxShadow: isCritical ? '0 0 16px hsl(0 72% 51% / 0.3)' : '0 0 12px hsl(38 92% 50% / 0.2)',
                    }}>
                    <TypeIcon className={`h-5 w-5 ${isCritical ? 'text-destructive animate-glow-pulse' : 'text-warning'}`} />
                  </div>
                  <div className="flex-1 space-y-1.5"
                    style={isCritical ? {
                      borderLeft: '2px solid hsl(0 72% 51% / 0.2)',
                      paddingLeft: '12px',
                      background: 'linear-gradient(90deg, hsl(0 72% 51% / 0.03), transparent)',
                      borderRadius: '0 8px 8px 0',
                      padding: '8px 12px',
                    } : undefined}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isCritical ? 'destructive' : 'secondary'} className={`text-xs ${isCritical ? 'glow-destructive' : ''}`}>
                        {typeLabels[alert.alert_type] ?? alert.alert_type}
                      </Badge>
                      {alert.recipes?.name && <span className="text-sm font-semibold">{alert.recipes.name}</span>}
                    </div>
                    {alert.message && <p className="text-sm text-muted-foreground">{alert.message}</p>}
                    <p className="text-xs text-muted-foreground/60">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <Dialog open={resolveId === alert.id} onOpenChange={open => { if (!open) setResolveId(null); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setResolveId(alert.id)}
                        className="shrink-0 hover:border-success/30 hover:text-success transition-all duration-300">
                        <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card depth-shadow border-shine">
                      <DialogHeader><DialogTitle>Resolver Alerta</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl glass">
                          <Badge variant="secondary" className="text-xs mb-1">{typeLabels[alert.alert_type]}</Badge>
                          <p className="text-sm">{alert.message || alert.recipes?.name}</p>
                        </div>
                        <Input placeholder="Ação tomada (ex: descartado, reposição feita)" value={action} onChange={e => setAction(e.target.value)} className="h-11 input-glow" />
                        <Button onClick={handleResolve} disabled={!action.trim() || resolveAlert.isPending}
                          className="w-full h-11 shine-effect"
                          style={{ background: 'linear-gradient(135deg, hsl(142 60% 40%), hsl(142 60% 35%))' }}>
                          <span className="relative z-10 flex items-center gap-2">
                            {resolveAlert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirmar Resolução
                          </span>
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryContent() {
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
    <div className="space-y-6">
      {/* Filter pills */}
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
          <p className="text-sm">Nenhum produto em estoque.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => {
            const hours = getStockAge(item.produced_at);
            const isCritical = hours > 12;
            return (
              <div
                key={item.id}
                className={`card-cinematic rounded-xl opacity-0 animate-fade-in`}
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
                      <p className="text-xs text-muted-foreground/70">Fatias</p>
                      <p className="text-3xl font-extrabold font-mono-numbers">{item.slices_available}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground/70">Tempo</p>
                      <p className="text-lg font-semibold font-mono-numbers">{hours.toFixed(1)}h</p>
                    </div>
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

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const { data: alertCount } = useAlertCount();
  const { data: inventory } = useInventory();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Controle em tempo real</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/30 p-1 rounded-full border border-border/30">
            <TabsTrigger
              value="inventory"
              className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-500 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              style={activeTab === 'inventory' ? { background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' } : undefined}
            >
              <Package className="h-4 w-4 mr-2" />
              Estoque ({inventory?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-500 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              style={activeTab === 'alerts' ? { background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' } : undefined}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alertas
              {(alertCount ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-[10px] glow-destructive">
                  {alertCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <InventoryContent />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsContent />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Inventory;
