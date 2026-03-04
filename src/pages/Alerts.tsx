import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, CheckCircle, Package, Clock, Trash2, HelpCircle } from 'lucide-react';
import { useActiveAlerts, useResolveAlert } from '@/hooks/useAlerts';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = { estoque_baixo: 'Estoque Baixo', validade_12h: 'Validade >12h', desperdicio: 'Desperdício', outro: 'Outro' };
const typeIcons: Record<string, React.ElementType> = { estoque_baixo: Package, validade_12h: Clock, desperdicio: Trash2, outro: HelpCircle };

const Alerts = () => {
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
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Alertas</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Estoque baixo, validade e desperdício — {alerts?.length ?? 0} ativos</p>
        </div>

        <div className="card-cinematic rounded-xl">
          <div className="p-6">
            <h3 className="flex items-center gap-2 font-bold text-lg mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
                      style={{
                        animationDelay: `${idx * 80}ms`,
                      }}
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
      </div>
    </AppLayout>
  );
};

export default Alerts;
