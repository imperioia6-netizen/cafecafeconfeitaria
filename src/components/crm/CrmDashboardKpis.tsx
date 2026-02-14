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
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: DollarSign,
      label: 'Receita Acumulada',
      value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      sub: 'total histórico',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Retenção',
      value: `${retentionRate}%`,
      sub: 'clientes ativos vs total',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Cake,
      label: 'Aniversários',
      value: upcomingBirthdays,
      sub: 'próximos 7 dias',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
    {
      icon: AlertTriangle,
      label: 'Em Risco',
      value: atRisk,
      sub: '30d+ sem comprar',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className="card-cinematic rounded-xl p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{kpi.label}</span>
          </div>
          <p className="font-mono-numbers text-2xl font-bold text-foreground leading-none">
            {kpi.value}
          </p>
          <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
        </div>
      ))}
    </div>
  );
};

export default CrmDashboardKpis;
