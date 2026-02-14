import { type Customer } from '@/hooks/useCustomers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, Instagram, Cake, ShoppingCart } from 'lucide-react';

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

const CustomerCard = ({ customer, onClick }: CustomerCardProps) => {
  const temp = getTemperature(customer.last_purchase_at);
  const daysSince = customer.last_purchase_at
    ? differenceInDays(new Date(), parseISO(customer.last_purchase_at))
    : null;

  return (
    <Card
      className="card-cinematic cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm">{customer.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`h-2 w-2 rounded-full ${temp.dot}`} />
              <Badge variant="outline" className={`text-[10px] ${temp.color} border-0`}>{temp.label}</Badge>
              {daysSince !== null && (
                <span className="text-[10px] text-muted-foreground">{daysSince}d sem comprar</span>
              )}
            </div>
          </div>
          <span className="font-mono-numbers text-sm font-semibold text-accent">
            R$ {Number(customer.total_spent).toFixed(0)}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {customer.phone && (
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
          )}
          {customer.email && (
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>
          )}
          {customer.instagram_handle && (
            <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />{customer.instagram_handle}</span>
          )}
          {customer.birthday && (
            <span className="flex items-center gap-1">
              <Cake className="h-3 w-3" />
              {format(parseISO(customer.birthday), 'dd/MM', { locale: ptBR })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
