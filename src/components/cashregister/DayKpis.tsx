import { Card, CardContent } from '@/components/ui/card';
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
        <Card key={kpi.key} className="card-premium opacity-0 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <kpi.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              {isLoading ? (
                <Skeleton className="h-6 w-20 mt-0.5" />
              ) : (
                <p className="text-lg font-bold font-mono-numbers truncate">
                  {kpi.format(data?.[kpi.key] ?? 0)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
