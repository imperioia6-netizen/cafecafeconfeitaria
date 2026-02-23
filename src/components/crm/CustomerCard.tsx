import { type Customer } from '@/hooks/useCustomers';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, Cake } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
}

const getTemperature = (lastPurchase: string | null) => {
  if (!lastPurchase) return { label: 'Novo', color: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' };
  const days = differenceInDays(new Date(), parseISO(lastPurchase));
  if (days <= 7) return { label: 'Quente', color: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' };
  if (days <= 30) return { label: 'Morno', color: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' };
  return { label: 'Frio', color: 'bg-red-500/20 text-red-400', dot: 'bg-red-400' };
};

const getInitials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const statusBg: Record<string, string> = {
  ativo: 'bg-emerald-500',
  inativo: 'bg-red-500',
  novo: 'bg-blue-500',
};

const CustomerCard = ({ customer, onClick }: CustomerCardProps) => {
  const temp = getTemperature(customer.last_purchase_at);
  const daysSince = customer.last_purchase_at
    ? differenceInDays(new Date(), parseISO(customer.last_purchase_at))
    : null;

  const spentScore = Math.min(Number(customer.total_spent || 0) / 500, 1) * 50;
  const recencyScore = daysSince !== null ? Math.max(0, 50 - daysSince) : 0;
  const engagement = Math.round(spentScore + recencyScore);

  return (
    <div
      className="card-cinematic cursor-pointer group rounded-xl p-4"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`h-10 w-10 rounded-full ${statusBg[customer.status] || 'bg-muted'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {getInitials(customer.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">{customer.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`h-1.5 w-1.5 rounded-full ${temp.dot}`} />
            <Badge variant="outline" className={`text-[9px] ${temp.color} border-0`}>{temp.label}</Badge>
            {daysSince !== null && (
              <span className="text-[10px] text-muted-foreground">{daysSince}d</span>
            )}
          </div>
        </div>
        <span className="font-mono-numbers text-sm font-bold text-accent shrink-0">
          R$ {Number(customer.total_spent).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </span>
      </div>

      {/* Engagement mini bar */}
      <div className="mb-3">
        <Progress value={engagement} className="h-1" />
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {customer.phone && (
          <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{customer.phone}</span>
        )}
        {customer.birthday && (
          <span className="flex items-center gap-1">
            <Cake className="h-2.5 w-2.5" />
            {format(parseISO(customer.birthday), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
};

export default CustomerCard;
