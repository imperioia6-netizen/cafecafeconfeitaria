import { useCustomers } from '@/hooks/useCustomers';
import { differenceInDays, parseISO, format, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Cake, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCrmN8n } from '@/hooks/useCrmN8n';

const BirthdayTimeline = () => {
  const { data: customers } = useCustomers();
  const { trigger } = useCrmN8n();
  const today = startOfDay(new Date());
  const next30 = addDays(today, 30);

  const upcomingBirthdays = (customers || [])
    .flatMap(c => {
      const entries: { customer: typeof c; type: 'cliente' | 'familiar'; date: Date; name: string }[] = [];
      if (c.birthday) {
        const d = parseISO(c.birthday);
        const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
        if (isBefore(thisYear, today)) thisYear.setFullYear(today.getFullYear() + 1);
        if (isBefore(thisYear, next30) || thisYear.getTime() === today.getTime()) {
          entries.push({ customer: c, type: 'cliente', date: thisYear, name: c.name });
        }
      }
      if (c.family_birthday && c.family_name) {
        const d = parseISO(c.family_birthday);
        const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
        if (isBefore(thisYear, today)) thisYear.setFullYear(today.getFullYear() + 1);
        if (isBefore(thisYear, next30) || thisYear.getTime() === today.getTime()) {
          entries.push({ customer: c, type: 'familiar', date: thisYear, name: c.family_name! });
        }
      }
      return entries;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const handleGenerate = (entry: typeof upcomingBirthdays[0]) => {
    const daysUntil = differenceInDays(entry.date, today);
    trigger.mutate({
      action_type: entry.type === 'cliente' ? 'aniversario_cliente' : 'aniversario_familiar',
      customer_data: {
        customer_id: entry.customer.id,
        customer_name: entry.customer.name,
        birthday_person: entry.name,
        days_until: daysUntil,
        favorite_product: entry.customer.favorite_recipe_id,
        total_spent: entry.customer.total_spent,
      },
    });
  };

  if (upcomingBirthdays.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Nenhum aniversário nos próximos 30 dias.</p>;
  }

  return (
    <div className="space-y-3">
      {upcomingBirthdays.map((entry, i) => {
        const daysUntil = differenceInDays(entry.date, today);
        return (
          <div key={`${entry.customer.id}-${entry.type}-${i}`} className="card-cinematic rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Cake className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{entry.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">
                    {entry.type === 'cliente' ? 'Cliente' : `Familiar de ${entry.customer.name}`}
                  </Badge>
                  <span>{format(entry.date, "dd 'de' MMMM", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={daysUntil === 0 ? 'default' : 'outline'} className={daysUntil === 0 ? 'bg-accent text-accent-foreground' : ''}>
                {daysUntil === 0 ? 'HOJE!' : `${daysUntil}d`}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => handleGenerate(entry)} disabled={trigger.isPending} className="border-accent/30 text-accent hover:bg-accent/10">
                <Send className="h-3 w-3 mr-1" />n8n
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BirthdayTimeline;
