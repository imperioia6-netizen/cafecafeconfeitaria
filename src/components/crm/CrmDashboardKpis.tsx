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
          className={`card-cinematic rounded-xl overflow-hidden ${kpi.isFirst ? 'border-shine' : ''}`}
          style={kpi.isFirst ? {
            background: 'linear-gradient(135deg, hsl(24 60% 20%), hsl(24 50% 14%))',
            color: 'hsl(36 40% 95%)',
          } : undefined}
        >
          <div className="p-3 md:p-4 space-y-2 md:space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className={`rounded-xl p-2.5 ${kpi.isFirst ? 'bg-accent/20' : 'bg-primary/10'}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.isFirst ? 'text-accent drop-shadow-[0_0_6px_hsl(36_70%_50%/0.5)]' : 'text-primary'}`} />
              </div>
              <span className={`text-sm font-medium ${kpi.isFirst ? 'text-white/90' : 'text-muted-foreground'}`}>
                {kpi.label}
              </span>
            </div>
            <p className={`font-mono-numbers text-lg md:text-2xl font-bold leading-none ${kpi.isFirst ? 'glow-gold' : 'text-foreground'}`}>
              {kpi.value}
            </p>
            <p className={`text-[10px] ${kpi.isFirst ? 'text-white/70' : 'text-muted-foreground'}`}>
              {kpi.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CrmDashboardKpis;
