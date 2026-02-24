import { useCustomers } from '@/hooks/useCustomers';
import { useCrmMessages } from '@/hooks/useCrmMessages';
import { differenceInDays, parseISO, format, addDays, isBefore, startOfDay, endOfWeek, startOfWeek, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Cake, Send, Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCrmN8n } from '@/hooks/useCrmN8n';

interface BirthdayEntry {
  customer: any;
  type: 'cliente' | 'familiar';
  date: Date;
  name: string;
}

const BirthdayTimeline = () => {
  const { data: customers, isError: customersError } = useCustomers();
  const { data: allMessages, isError: messagesError } = useCrmMessages();
  const { trigger } = useCrmN8n();
  const today = startOfDay(new Date());
  const next30 = addDays(today, 30);

  const upcomingBirthdays: BirthdayEntry[] = (customers || [])
    .flatMap(c => {
      const entries: BirthdayEntry[] = [];
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

  // Group by week
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });

  const thisWeek = upcomingBirthdays.filter(e => e.date <= thisWeekEnd);
  const nextWeek = upcomingBirthdays.filter(e => e.date > thisWeekEnd && e.date <= nextWeekEnd);
  const later = upcomingBirthdays.filter(e => e.date > nextWeekEnd);

  // Count messages per customer for birthday types
  const getMessageCount = (customerId: string) => {
    return (allMessages || []).filter(m =>
      m.customer_id === customerId &&
      (m.message_type === 'aniversario_cliente' || m.message_type === 'aniversario_familiar')
    ).length;
  };

  const handleGenerate = (entry: BirthdayEntry) => {
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

  const handleSendAll = () => {
    upcomingBirthdays.forEach(entry => handleGenerate(entry));
  };

  if (upcomingBirthdays.length === 0) {
    return (
      <div className="text-center py-12">
        <Cake className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nenhum aniversário nos próximos 30 dias.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Cadastre datas de aniversário nos perfis dos clientes 🎂</p>
      </div>
    );
  }

  const renderGroup = (title: string, entries: BirthdayEntry[]) => {
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold px-1">{title}</h4>
        {entries.map((entry, i) => {
          const daysUntil = differenceInDays(entry.date, today);
          const msgCount = getMessageCount(entry.customer.id);
          const flowProgress = Math.min(msgCount, 6);
          return (
            <div key={`${entry.customer.id}-${entry.type}-${i}`} className="card-cinematic rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Cake className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">
                        {entry.type === 'cliente' ? 'Cliente' : `Familiar de ${entry.customer.name}`}
                      </Badge>
                      <span>{format(entry.date, "dd 'de' MMM", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={daysUntil === 0 ? 'default' : 'outline'} className={daysUntil === 0 ? 'bg-accent text-accent-foreground animate-pulse' : ''}>
                    {daysUntil === 0 ? '🎉 HOJE!' : `${daysUntil}d`}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => handleGenerate(entry)} disabled={trigger.isPending} className="border-accent/30 text-accent hover:bg-accent/10 h-8">
                    <Send className="h-3 w-3 mr-1" />n8n
                  </Button>
                </div>
              </div>
              {/* Message flow progress */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Fluxo de mensagens</span>
                  <span className="font-mono-numbers">{flowProgress}/6</span>
                </div>
                <Progress value={(flowProgress / 6) * 100} className="h-1" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium text-foreground">{upcomingBirthdays.length} aniversários próximos</span>
        </div>
        <Button size="sm" onClick={handleSendAll} disabled={trigger.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5">
          <Zap className="h-3 w-3" />Enviar Todos via n8n
        </Button>
      </div>

      {renderGroup('🔥 Esta Semana', thisWeek)}
      {renderGroup('📅 Próxima Semana', nextWeek)}
      {renderGroup('📆 Este Mês', later)}
    </div>
  );
};

export default BirthdayTimeline;
