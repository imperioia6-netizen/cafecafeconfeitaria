import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useActiveAlerts, useResolveAlert } from '@/hooks/useAlerts';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  estoque_baixo: 'Estoque Baixo',
  validade_12h: 'Validade >12h',
  desperdicio: 'Desperdício',
  outro: 'Outro',
};

const typeColors: Record<string, string> = {
  estoque_baixo: 'bg-amber-100 text-amber-800',
  validade_12h: 'bg-red-100 text-red-800',
  desperdicio: 'bg-orange-100 text-orange-800',
  outro: 'bg-gray-100 text-gray-800',
};

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
    } catch {
      toast.error('Erro ao resolver alerta');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground mt-1">Estoque baixo, validade e desperdício</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Alertas Ativos ({alerts?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !alerts?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta no momento ✦</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={typeColors[alert.alert_type] ?? ''}>{typeLabels[alert.alert_type] ?? alert.alert_type}</Badge>
                        {alert.recipes?.name && <span className="text-sm font-medium">{alert.recipes.name}</span>}
                      </div>
                      {alert.message && <p className="text-sm text-muted-foreground">{alert.message}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <Dialog open={resolveId === alert.id} onOpenChange={open => { if (!open) setResolveId(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setResolveId(alert.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Resolver Alerta</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <Input
                            placeholder="Ação tomada (ex: descartado, reposição feita)"
                            value={action}
                            onChange={e => setAction(e.target.value)}
                          />
                          <Button onClick={handleResolve} disabled={!action.trim() || resolveAlert.isPending} className="w-full">
                            Confirmar Resolução
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Alerts;
