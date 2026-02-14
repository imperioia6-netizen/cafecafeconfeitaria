import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  Package, ChefHat, Coffee, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useDashboardKPIs, useSalesChart } from '@/hooks/useDashboard';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({
  title, value, subtitle, icon: Icon, delay, trend,
}: {
  title: string; value: string; subtitle: string; icon: React.ElementType; delay: string; trend?: number;
}) => (
  <Card className={`card-premium gradient-border opacity-0 animate-fade-in ${delay}`}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      <div className="rounded-full bg-primary/10 p-2.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold tracking-tight font-mono-numbers">{value}</div>
      <div className="flex items-center gap-2 mt-1.5">
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-4 py-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold font-mono-numbers">R$ {payload[0].value.toFixed(2)}</p>
    </div>
  );
};

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
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Faturamento" value={`R$ ${(kpis?.revenue ?? 0).toFixed(2)}`} subtitle="hoje" icon={DollarSign} delay="animate-stagger-1" />
              <StatCard title="Vendas" value={String(kpis?.salesCount ?? 0)} subtitle="balcão + delivery" icon={ShoppingCart} delay="animate-stagger-2" />
              <StatCard title="Ticket Médio" value={`R$ ${(kpis?.avgTicket ?? 0).toFixed(2)}`} subtitle="média por venda" icon={TrendingUp} delay="animate-stagger-3" />
              <StatCard title="Estoque Crítico" value={String(kpis?.criticalStock ?? 0)} subtitle="produtos em alerta" icon={AlertTriangle} delay="animate-stagger-4" />
            </div>

            {/* Area Chart */}
            {chartData && chartData.length > 0 && (
              <Card className="card-premium gradient-border opacity-0 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Vendas — Últimos 7 dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 90%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(24, 10%, 45%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(24, 10%, 45%)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(36, 70%, 50%)"
                        strokeWidth={2.5}
                        fill="url(#chartGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Quick Access */}
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { label: 'Receitas', desc: 'Cadastrar e gerenciar', icon: ChefHat, path: '/recipes', gradient: 'from-primary/10 to-accent/10' },
            { label: 'Produção', desc: 'Registrar produção', icon: Coffee, path: '/production', gradient: 'from-success/10 to-success/5' },
            { label: 'Estoque', desc: 'Monitorar em tempo real', icon: Package, path: '/inventory', gradient: 'from-destructive/10 to-warning/10' },
          ].map((item, i) => (
            <Card
              key={item.path}
              className={`card-premium cursor-pointer group opacity-0 animate-fade-in`}
              style={{ animationDelay: `${500 + i * 100}ms` }}
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`rounded-xl bg-gradient-to-br ${item.gradient} p-3.5 transition-transform group-hover:scale-110`}>
                  <item.icon className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts Timeline */}
        <Card className="card-premium">
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
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                {alerts.slice(0, 5).map((a: any, idx: number) => (
                  <div key={a.id} className="relative flex items-start gap-4 py-3 pl-1">
                    <div className={`relative z-10 h-[10px] w-[10px] rounded-full mt-1.5 ring-4 ring-background ${
                      a.alert_type === 'validade_12h' ? 'bg-destructive animate-glow-pulse' :
                      a.alert_type === 'estoque_baixo' ? 'bg-warning' : 'bg-muted-foreground'
                    }`} />
                    <div className="flex-1 flex items-center gap-3">
                      <Badge variant="outline" className="text-xs shrink-0">{a.alert_type}</Badge>
                      <span className="text-sm">{a.message ?? a.recipes?.name}</span>
                    </div>
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
