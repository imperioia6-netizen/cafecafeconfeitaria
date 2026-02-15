import { useCustomers } from '@/hooks/useCustomers';
import { differenceInDays, parseISO, addDays, startOfDay } from 'date-fns';
import { Users, DollarSign, TrendingUp, Cake, AlertTriangle } from 'lucide-react';

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
      isFirst: true,
    },
    {
      icon: DollarSign,
      label: 'Receita Acumulada',
      value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      sub: 'total histórico',
    },
    {
      icon: TrendingUp,
      label: 'Retenção',
      value: `${retentionRate}%`,
      sub: 'clientes ativos vs total',
    },
    {
      icon: Cake,
      label: 'Aniversários',
      value: upcomingBirthdays,
      sub: 'próximos 7 dias',
    },
    {
      icon: AlertTriangle,
      label: 'Em Risco',
      value: atRisk,
      sub: '30d+ sem comprar',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={`card-cinematic rounded-xl overflow-hidden opacity-0 animate-fade-in animate-stagger-${i + 1} ${kpi.isFirst ? 'border-shine light-first-card' : ''}`}
        >
          <div className="p-3 md:p-4 space-y-2 md:space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className={`rounded-xl p-2.5 animate-float ${kpi.isFirst ? 'bg-accent/20 dark:bg-primary/10' : 'bg-primary/10'}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.isFirst ? 'text-accent drop-shadow-[0_0_6px_hsl(36_70%_50%/0.5)] dark:text-primary dark:drop-shadow-none' : 'text-primary'}`} />
              </div>
              <span className={`text-sm font-medium ${kpi.isFirst ? 'text-primary-foreground/70 dark:text-muted-foreground' : 'text-muted-foreground'}`}>
                {kpi.label}
              </span>
            </div>
            <p className={`font-mono-numbers text-lg md:text-2xl font-bold leading-none ${kpi.isFirst ? 'glow-gold dark:text-foreground dark:[text-shadow:none]' : 'text-foreground'}`}>
              {kpi.value}
            </p>
            <p className={`text-[10px] ${kpi.isFirst ? 'text-primary-foreground/50 dark:text-muted-foreground' : 'text-muted-foreground'}`}>
              {kpi.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CrmDashboardKpis;
