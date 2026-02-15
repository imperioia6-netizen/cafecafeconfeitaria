import { DollarSign, ShoppingCart, TrendingUp, Lock } from 'lucide-react';
import { useDaySummary } from '@/hooks/useCashRegister';
import { Skeleton } from '@/components/ui/skeleton';

const kpis = [
  { key: 'revenue', label: 'Faturamento Hoje', icon: DollarSign, format: (v: number) => `R$ ${v.toFixed(2)}` },
  { key: 'count', label: 'Total Vendas', icon: ShoppingCart, format: (v: number) => String(v) },
  { key: 'avgTicket', label: 'Ticket Médio', icon: TrendingUp, format: (v: number) => `R$ ${v.toFixed(2)}` },
  { key: 'closedCount', label: 'Caixas Fechados', icon: Lock, format: (v: number) => String(v) },
] as const;

export default function DayKpis() {
  const { data, isLoading } = useDaySummary();

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => (
        <div key={kpi.key} className="card-cinematic rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="p-3 md:p-5 space-y-2 md:space-y-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <kpi.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-lg md:text-2xl font-bold font-mono-numbers">
                {kpi.format(data?.[kpi.key] ?? 0)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
