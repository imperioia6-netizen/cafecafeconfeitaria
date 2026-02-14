import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Package,
  ChefHat,
  Coffee,
  Loader2,
} from 'lucide-react';
import { useDashboardKPIs, useSalesChart } from '@/hooks/useDashboard';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({
  title, value, subtitle, icon: Icon,
}: {
  title: string; value: string; subtitle: string; icon: React.ElementType;
}) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useDashboardKPIs();
  const { data: chartData } = useSalesChart();
  const { data: alerts } = useActiveAlerts();

  if (!isOwner) return <Navigate to="/production" replace />;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Faturamento Hoje" value={`R$ ${(kpis?.revenue ?? 0).toFixed(2)}`} subtitle="vendas do dia" icon={DollarSign} />
              <StatCard title="Vendas Hoje" value={String(kpis?.salesCount ?? 0)} subtitle="balcão + delivery" icon={ShoppingCart} />
              <StatCard title="Ticket Médio" value={`R$ ${(kpis?.avgTicket ?? 0).toFixed(2)}`} subtitle="média por venda" icon={TrendingUp} />
              <StatCard title="Estoque Crítico" value={String(kpis?.criticalStock ?? 0)} subtitle="produtos em alerta" icon={AlertTriangle} />
            </div>

            {/* Chart */}
            {chartData && chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendas — Últimos 7 dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Faturamento']} />
                      <Bar dataKey="total" fill="hsl(24, 60%, 23%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Quick Access */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={() => navigate('/recipes')}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-xl bg-primary/10 p-3"><ChefHat className="h-6 w-6 text-primary" /></div>
              <div>
                <h3 className="font-semibold">Receitas</h3>
                <p className="text-sm text-muted-foreground">Cadastrar e gerenciar</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={() => navigate('/production')}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-xl bg-accent/20 p-3"><Coffee className="h-6 w-6 text-accent-foreground" /></div>
              <div>
                <h3 className="font-semibold">Produção</h3>
                <p className="text-sm text-muted-foreground">Registrar produção</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={() => navigate('/inventory')}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-xl bg-destructive/10 p-3"><Package className="h-6 w-6 text-destructive" /></div>
              <div>
                <h3 className="font-semibold">Estoque</h3>
                <p className="text-sm text-muted-foreground">Monitorar em tempo real</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!alerts?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta no momento ✦</p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Badge variant="destructive" className="text-xs">{a.alert_type}</Badge>
                    <span className="text-sm">{a.message ?? a.recipes?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
