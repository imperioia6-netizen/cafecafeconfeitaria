import { useCustomers } from '@/hooks/useCustomers';
import { differenceInDays, parseISO, addDays, startOfDay } from 'date-fns';
import { Users, DollarSign, TrendingUp, Cake, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CrmDashboardKpis = () => {
  const { data: customers } = useCustomers();
  const all = customers || [];
  const today = startOfDay(new Date());
  const next7 = addDays(today, 7);

  const active = all.filter(c => c.status === 'ativo').length;
  const inactive = all.filter(c => c.status === 'inativo').length;
  const newC = all.filter(c => c.status === 'novo').length;
  const totalRevenue = all.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const retentionRate = all.length > 0 ? Math.round((active / all.length) * 100) : 0;

  const atRisk = all.filter(c => {
    if (!c.last_purchase_at) return false;
    return differenceInDays(new Date(), parseISO(c.last_purchase_at)) >= 30;
  }).length;

  const upcomingBirthdays = all.filter(c => {
    if (!c.birthday) return false;
    const d = parseISO(c.birthday);
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
    return thisYear >= today && thisYear <= next7;
  }).length;

  const kpis = [
    {
      icon: Users,
      label: 'Clientes',
      value: all.length,
      sub: `${active} ativos · ${inactive} inat. · ${newC} novos`,
      accent: true,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
    },
    {
      icon: DollarSign,
      label: 'Receita acumulada',
      value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: 'Total histórico',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: TrendingUp,
      label: 'Retenção',
      value: `${retentionRate}%`,
      sub: 'Ativos vs total',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Cake,
      label: 'Aniversários',
      value: upcomingBirthdays,
      sub: 'Próximos 7 dias',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: AlertTriangle,
      label: 'Em risco',
      value: atRisk,
      sub: '30+ dias sem compra',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {kpis.map((kpi) => (
        <article
          key={kpi.label}
          className={cn(
            'relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden',
            'transition-all duration-200 hover:shadow-md hover:border-border/80',
            kpi.accent && 'border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10'
          )}
        >
          <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[100px] sm:min-h-[110px]">
            <div className="flex items-center justify-between gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  kpi.iconBg,
                  kpi.iconColor
                )}
              >
                <kpi.icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                {kpi.label}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold text-lg sm:text-xl tabular-nums tracking-tight text-foreground">
                {kpi.value}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">
                {kpi.sub}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default CrmDashboardKpis;
