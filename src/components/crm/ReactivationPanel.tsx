import { useCustomers } from '@/hooks/useCustomers';
import { useCrmMessages } from '@/hooks/useCrmMessages';
import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Send, AlertTriangle, Zap, DollarSign, Users } from 'lucide-react';
import { useCrmN8n } from '@/hooks/useCrmN8n';

const ReactivationPanel = () => {
  const { data: customers, isError: customersError } = useCustomers();
  const { data: allMessages, isError: messagesError } = useCrmMessages();
  const { trigger } = useCrmN8n();

  if (customersError || messagesError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-10 w-10 text-destructive/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Erro ao carregar dados</p>
        <p className="text-xs text-muted-foreground mt-1">Tente recarregar a página</p>
      </div>
    );
  }

  const inactiveCustomers = (customers || []).filter(c => {
    if (!c.last_purchase_at) return false;
    return differenceInDays(new Date(), parseISO(c.last_purchase_at)) >= 30;
  }).sort((a, b) => {
    if (!a.last_purchase_at || !b.last_purchase_at) return 0;
    const dA = differenceInDays(new Date(), parseISO(a.last_purchase_at));
    const dB = differenceInDays(new Date(), parseISO(b.last_purchase_at));
    return dB - dA;
  });

  // Segment by severity
  const seg30 = inactiveCustomers.filter(c => {
    if (!c.last_purchase_at) return false;
    const d = differenceInDays(new Date(), parseISO(c.last_purchase_at));
    return d >= 30 && d < 60;
  });
  const seg60 = inactiveCustomers.filter(c => {
    if (!c.last_purchase_at) return false;
    const d = differenceInDays(new Date(), parseISO(c.last_purchase_at));
    return d >= 60 && d < 90;
  });
  const seg90 = inactiveCustomers.filter(c => {
    if (!c.last_purchase_at) return false;
    const d = differenceInDays(new Date(), parseISO(c.last_purchase_at));
    return d >= 90;
  });

  const valueAtRisk = inactiveCustomers.reduce((s, c) => s + Number(c.total_spent || 0), 0);

  const getAttempts = (customerId: string) => {
    return (allMessages || []).filter(m => m.customer_id === customerId && m.message_type === 'reativacao').length;
  };

  const handleReactivate = (customer: typeof inactiveCustomers[0]) => {
    trigger.mutate({
      action_type: 'reativacao',
      customer_data: {
        customer_id: customer.id,
        customer_name: customer.name,
        days_inactive: customer.last_purchase_at ? differenceInDays(new Date(), parseISO(customer.last_purchase_at)) : 0,
        total_spent: customer.total_spent,
        favorite_product: customer.favorite_recipe_id,
        phone: customer.phone,
      },
    });
  };

  const handleReactivateAll = () => {
    inactiveCustomers.forEach(c => handleReactivate(c));
  };

  if (inactiveCustomers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nenhum cliente inativo (30d+). Ótimo! 🎉</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Todos os clientes estão comprando regularmente</p>
      </div>
    );
  }

  const segments = [
    { label: '30-60d', count: seg30.length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: '60-90d', count: seg60.length, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: '90d+', count: seg90.length, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  const renderCustomerRow = (c: typeof inactiveCustomers[0]) => {
    const days = differenceInDays(new Date(), parseISO(c.last_purchase_at!));
    const attempts = getAttempts(c.id);
    const severity = days >= 90 ? 'bg-red-500/10 border-red-500/20' : days >= 60 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-amber-500/10 border-amber-500/20';
    const severityText = days >= 90 ? 'text-red-400' : days >= 60 ? 'text-orange-400' : 'text-amber-400';

    return (
      <div key={c.id} className={`card-cinematic rounded-xl p-4 border ${severity}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`h-9 w-9 rounded-full ${days >= 90 ? 'bg-red-500' : days >= 60 ? 'bg-orange-500' : 'bg-amber-500'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`text-[9px] border-0 ${severityText} ${severity}`}>{days}d inativo</Badge>
                <span className="text-[10px] text-muted-foreground font-mono-numbers">R$ {Number(c.total_spent).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                {attempts > 0 && (
                  <Badge variant="outline" className="text-[9px]">{attempts}x tentado</Badge>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleReactivate(c)} disabled={trigger.isPending} className="border-accent/30 text-accent hover:bg-accent/10 shrink-0">
            <Send className="h-3 w-3 mr-1" />Reativar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-cinematic rounded-xl p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <p className="font-mono-numbers text-2xl font-bold text-foreground">{inactiveCustomers.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inativos</p>
        </div>
        <div className="card-cinematic rounded-xl p-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto mb-1 text-accent" />
          <p className="font-mono-numbers text-2xl font-bold text-foreground">
            R$ {valueAtRisk.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor em Risco</p>
        </div>
        {segments.map(seg => (
          <div key={seg.label} className={`card-cinematic rounded-xl p-4 text-center`}>
            <p className={`font-mono-numbers text-2xl font-bold ${seg.color}`}>{seg.count}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{seg.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleReactivateAll} disabled={trigger.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5">
          <Zap className="h-3.5 w-3.5" />Reativar Todos via n8n
        </Button>
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {inactiveCustomers.map(renderCustomerRow)}
      </div>
    </div>
  );
};

export default ReactivationPanel;
