import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground mt-1">Estoque baixo, validade e desperdício — {alerts?.length ?? 0} ativos</p>
        </div>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Timeline de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !alerts?.length ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-success/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum alerta no momento ✦</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                {alerts.map((alert: any, idx: number) => {
                  const TypeIcon = typeIcons[alert.alert_type] || AlertTriangle;
                  const isCritical = alert.alert_type === 'validade_12h';
                  return (
                    <div key={alert.id} className={`relative flex items-start gap-4 py-4 pl-0 opacity-0 animate-fade-in`} style={{ animationDelay: `${idx * 80}ms` }}>
                      <div className={`relative z-10 flex items-center justify-center h-10 w-10 rounded-full ring-4 ring-background ${
                        isCritical ? 'bg-destructive/15' : 'bg-warning/15'
                      }`}>
                        <TypeIcon className={`h-5 w-5 ${isCritical ? 'text-destructive animate-glow-pulse' : 'text-warning'}`} />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-xs">
                            {typeLabels[alert.alert_type] ?? alert.alert_type}
                          </Badge>
                          {alert.recipes?.name && <span className="text-sm font-semibold">{alert.recipes.name}</span>}
                        </div>
                        {alert.message && <p className="text-sm text-muted-foreground">{alert.message}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <Dialog open={resolveId === alert.id} onOpenChange={open => { if (!open) setResolveId(null); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setResolveId(alert.id)} className="shrink-0">
                            <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-strong">
                          <DialogHeader><DialogTitle>Resolver Alerta</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                              <Badge variant="secondary" className="text-xs mb-1">{typeLabels[alert.alert_type]}</Badge>
                              <p className="text-sm">{alert.message || alert.recipes?.name}</p>
                            </div>
                            <Input placeholder="Ação tomada (ex: descartado, reposição feita)" value={action} onChange={e => setAction(e.target.value)} className="h-11" />
                            <Button onClick={handleResolve} disabled={!action.trim() || resolveAlert.isPending}
                              className="w-full h-11 bg-gradient-to-r from-success to-success/80">
                              {resolveAlert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Confirmar Resolução
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Alerts;
