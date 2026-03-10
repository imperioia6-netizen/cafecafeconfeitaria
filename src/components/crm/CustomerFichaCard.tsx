import { type Customer } from '@/hooks/useCustomers';
import { Phone, Mail, Cake, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  customer: Customer;
  onClick?: () => void;
}

const getInitials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const CustomerFichaCard = ({ customer, onClick }: Props) => {
  const c = customer as Customer & { address?: string | null };

  return (
    <div
      className="card-cinematic cursor-pointer group rounded-xl p-5 space-y-3 hover:scale-[1.01] transition-transform"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-accent/80 flex items-center justify-center text-accent-foreground text-sm font-bold shrink-0">
          {getInitials(customer.name)}
        </div>
        <h3 className="font-semibold text-foreground text-sm truncate flex-1">{customer.name}</h3>
      </div>

      {/* Fields */}
      <div className="space-y-2 text-xs text-muted-foreground">
        {customer.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.birthday && (
          <div className="flex items-center gap-2">
            <Cake className="h-3.5 w-3.5 shrink-0" />
            <span>{format(parseISO(customer.birthday), "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
        )}
        {c.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{c.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerFichaCard;
