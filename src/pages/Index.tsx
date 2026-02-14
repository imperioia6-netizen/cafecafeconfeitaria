import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  Package, ChefHat, Coffee, Loader2,
} from 'lucide-react';
import { useDashboardKPIs, useSalesChart } from '@/hooks/useDashboard';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

/* ─── KPI Card ───────────────────────────────────────── */
const KpiCard = ({
  title, icon: Icon, today, label7d, label30d, isCurrency = true, isFirst = false, delay,
}: {
  title: string;
  icon: React.ElementType;
  today: number;
  label7d: string;
  label30d: string;
  isCurrency?: boolean;
  isFirst?: boolean;
  delay: string;
}) => {
  const fmt = (v: number) => isCurrency ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : String(v);

  return (
    <Card className={`overflow-hidden opacity-0 animate-fade-in ${delay} ${isFirst ? 'bg-primary text-primary-foreground' : 'card-premium'}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-full p-2 ${isFirst ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
            <Icon className={`h-4 w-4 ${isFirst ? 'text-primary-foreground' : 'text-primary'}`} />
          </div>
          <span className={`text-sm font-medium ${isFirst ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {title}
          </span>
        </div>

        <div>
          <p className={`text-xs ${isFirst ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>Hoje:</p>
          <p className={`text-2xl font-bold font-mono-numbers tracking-tight ${isFirst ? '' : ''}`}>
            {fmt(today)}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className={`flex items-center justify-between text-sm ${isFirst ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            <span>7 dias:</span>
            <span className="font-mono-numbers font-medium">{label7d}</span>
          </div>
          <div className={`flex items-center justify-between text-sm ${isFirst ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            <span>30 dias:</span>
            <span className="font-mono-numbers font-medium">{label30d}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Chart Tooltip ──────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-4 py-3 shadow-xl border border-border/50">
      <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-sm font-bold font-mono-numbers text-primary">
        R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
      {payload[1] && (
        <p className="text-xs text-muted-foreground font-mono-numbers mt-0.5">
          {payload[1].value} vendas
        </p>
      )}
    </div>
  );
};

/* ─── Dashboard ──────────────────────────────────────── */
const Dashboard = () => {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useDashboardKPIs();
  const { data: chartData } = useSalesChart();
  const { data: alerts } = useActiveAlerts();

  if (!isOwner) return <Navigate to="/production" replace />;

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Faturamento"
                icon={DollarSign}
                today={kpis?.revenue ?? 0}
                label7d={fmtCurrency(kpis?.revenue7d ?? 0)}
                label30d={fmtCurrency(kpis?.revenue30d ?? 0)}
                isFirst
                delay="animate-stagger-1"
              />
              <KpiCard
                title="Vendas"
                icon={ShoppingCart}
                today={kpis?.salesCount ?? 0}
                label7d={String(kpis?.salesCount7d ?? 0)}
                label30d={String(kpis?.salesCount30d ?? 0)}
                isCurrency={false}
                delay="animate-stagger-2"
              />
              <KpiCard
                title="Ticket Médio"
                icon={TrendingUp}
                today={kpis?.avgTicket ?? 0}
                label7d={fmtCurrency(kpis?.avgTicket7d ?? 0)}
                label30d={fmtCurrency(kpis?.avgTicket30d ?? 0)}
                delay="animate-stagger-3"
              />
              <KpiCard
                title="Estoque Crítico"
                icon={AlertTriangle}
                today={kpis?.criticalStock ?? 0}
                label7d="-"
                label30d="-"
                isCurrency={false}
                delay="animate-stagger-4"
              />
            </div>

            {/* ── Performance Chart ── */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card
                className="lg:col-span-2 overflow-hidden opacity-0 animate-fade-in border-0 bg-primary text-primary-foreground"
                style={{ animationDelay: '350ms' }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-primary-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Seu Desempenho
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  {chartData && chartData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 30%, 30%)" strokeOpacity={0.3} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: 'hsl(36, 40%, 75%)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(36, 40%, 75%)' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `R$ ${v}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(36, 70%, 50%)"
                            strokeWidth={2.5}
                            fill="url(#perfGrad)"
                            dot={{ fill: 'hsl(36, 70%, 50%)', r: 4, strokeWidth: 2, stroke: 'hsl(24, 60%, 23%)' }}
                            activeDot={{ r: 6, fill: 'hsl(36, 90%, 65%)', stroke: 'hsl(24, 60%, 23%)', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Summary row */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {[
                          { label: 'Vendas Hoje', value: String(kpis?.salesCount ?? 0) },
                          { label: 'Faturamento', value: fmtCurrency(kpis?.revenue ?? 0) },
                          { label: 'Ticket Médio', value: fmtCurrency(kpis?.avgTicket ?? 0) },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl bg-primary-foreground/10 px-4 py-3 text-center"
                          >
                            <p className="text-xs text-primary-foreground/60">{item.label}</p>
                            <p className="text-sm font-bold font-mono-numbers text-accent mt-0.5">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-primary-foreground/50 text-center py-12">
                      Sem dados de vendas ainda
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* ── Alerts Panel ── */}
              <Card className="card-premium opacity-0 animate-fade-in" style={{ animationDelay: '450ms' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    <AlertTriangle className="h-4 w-4 text-accent" />
                    Alertas Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!alerts?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Nenhum alerta ativo ✦
                    </p>
                  ) : (
                    <div className="relative space-y-0">
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                      {alerts.slice(0, 6).map((a: any) => (
                        <div key={a.id} className="relative flex items-start gap-3 py-2.5 pl-1">
                          <div className={`relative z-10 h-[10px] w-[10px] rounded-full mt-1.5 ring-4 ring-card ${
                            a.alert_type === 'validade_12h' ? 'bg-destructive animate-glow-pulse' :
                            a.alert_type === 'estoque_baixo' ? 'bg-warning' : 'bg-muted-foreground'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-[10px] mb-0.5">{a.alert_type}</Badge>
                            <p className="text-xs text-muted-foreground truncate">{a.message ?? a.recipes?.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ── Quick Access ── */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Receitas', desc: 'Cadastrar e gerenciar', icon: ChefHat, path: '/recipes' },
            { label: 'Produção', desc: 'Registrar produção', icon: Coffee, path: '/production' },
            { label: 'Estoque', desc: 'Monitorar em tempo real', icon: Package, path: '/inventory' },
          ].map((item, i) => (
            <Card
              key={item.path}
              className="card-premium cursor-pointer group opacity-0 animate-fade-in"
              style={{ animationDelay: `${550 + i * 80}ms` }}
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-primary/10 p-3 transition-transform group-hover:scale-110">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
