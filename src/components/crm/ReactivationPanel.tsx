import { useCustomers } from '@/hooks/useCustomers';
import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, AlertTriangle } from 'lucide-react';
import { useCrmN8n } from '@/hooks/useCrmN8n';

const ReactivationPanel = () => {
  const { data: customers } = useCustomers();
  const { trigger } = useCrmN8n();

  const inactiveCustomers = (customers || []).filter(c => {
    if (!c.last_purchase_at) return false;
    return differenceInDays(new Date(), parseISO(c.last_purchase_at)) >= 30;
  }).sort((a, b) => {
    const dA = differenceInDays(new Date(), parseISO(a.last_purchase_at!));
    const dB = differenceInDays(new Date(), parseISO(b.last_purchase_at!));
    return dB - dA;
  });

  const handleReactivate = (customer: typeof inactiveCustomers[0]) => {
    trigger.mutate({
      action_type: 'reativacao',
      customer_data: {
        customer_id: customer.id,
        customer_name: customer.name,
        days_inactive: differenceInDays(new Date(), parseISO(customer.last_purchase_at!)),
        total_spent: customer.total_spent,
        favorite_product: customer.favorite_recipe_id,
        phone: customer.phone,
      },
    });
  };

  if (inactiveCustomers.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Nenhum cliente inativo (30d+). Ótimo! 🎉</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <span className="text-sm font-medium text-foreground">{inactiveCustomers.length} clientes inativos</span>
      </div>
      {inactiveCustomers.map(c => {
        const days = differenceInDays(new Date(), parseISO(c.last_purchase_at!));
        return (
          <div key={c.id} className="card-cinematic rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400 border-0">{days}d inativo</Badge>
                <span className="text-[10px] text-muted-foreground font-mono-numbers">R$ {Number(c.total_spent).toFixed(0)} gasto</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleReactivate(c)} disabled={trigger.isPending} className="border-accent/30 text-accent hover:bg-accent/10">
              <Send className="h-3 w-3 mr-1" />Reativar via n8n
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default ReactivationPanel;
