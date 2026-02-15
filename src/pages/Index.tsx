import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  Package, ChefHat, Coffee, Loader2, MoreVertical, Calendar, CalendarRange,
} from 'lucide-react';
import { useDashboardKPIs, useSalesChart } from '@/hooks/useDashboard';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    <div
      className={`card-cinematic rounded-xl overflow-hidden opacity-0 animate-fade-in ${delay} ${isFirst ? 'border-shine' : ''}`}
      style={isFirst ? {
        background: 'linear-gradient(135deg, hsl(24 60% 20%), hsl(24 50% 14%))',
        color: 'hsl(36 40% 95%)',
      } : undefined}
    >
      <div className="p-5 space-y-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-full p-2.5 animate-float ${isFirst ? 'bg-accent/20' : 'bg-primary/8'}`}>
            <Icon className={`h-4 w-4 ${isFirst ? 'text-accent drop-shadow-[0_0_6px_hsl(36_70%_50%/0.5)]' : 'text-primary'}`} />
          </div>
          <span className={`text-sm font-medium ${isFirst ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {title}
          </span>
        </div>

        <div>
          <p className={`text-xs ${isFirst ? 'text-primary-foreground/50' : 'text-muted-foreground/70'}`}>Hoje:</p>
          <p className={`text-3xl font-bold font-mono-numbers tracking-tight ${isFirst ? 'glow-gold' : ''}`}>
            {fmt(today)}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className={`flex items-center justify-between text-sm ${isFirst ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            <span>7 dias:</span>
            <span className="font-mono-numbers font-medium">{label7d}</span>
          </div>
          <div className={`flex items-center justify-between text-sm ${isFirst ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            <span>30 dias:</span>
            <span className="font-mono-numbers font-medium">{label30d}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Chart Tooltip ──────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-4 py-3 depth-shadow border-none">
      <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-sm font-bold font-mono-numbers text-accent">
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
  const [chartDays, setChartDays] = useState(7);
  const [chartMode, setChartMode] = useState<'preset' | 'custom'>('preset');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const customRange = chartMode === 'custom' && customFrom && customTo ? { from: customFrom, to: customTo } : undefined;
  const { data: chartData } = useSalesChart(chartDays, customRange);
  const { data: alerts } = useActiveAlerts();

  if (!isOwner) return <Navigate to="/production" replace />;

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handlePreset = (days: number) => {
    setChartMode('preset');
    setChartDays(days);
    setCustomFrom(undefined);
    setCustomTo(undefined);
  };

  const chartLabel = chartMode === 'custom' && customFrom && customTo
    ? `${format(customFrom, 'dd/MM', { locale: ptBR })} - ${format(customTo, 'dd/MM', { locale: ptBR })}`
    : chartDays === 7 ? '7 dias' : 'Últimos 30 dias';

  return (
    <AppLayout>
      <div className="space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 animate-glow-pulse" style={{ boxShadow: '0 0 20px hsl(36 70% 50% / 0.3)' }} />
            </div>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid gap-5 lg:grid-cols-3">
              <div
                className="lg:col-span-2 card-cinematic rounded-xl overflow-hidden opacity-0 animate-fade-in"
                style={{
                  animationDelay: '350ms',
                  background: 'radial-gradient(ellipse at 20% 20%, hsl(24 50% 18%), hsl(24 45% 12%) 60%, hsl(24 40% 8%))',
                  color: 'hsl(36 40% 95%)',
                }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h3 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Seu Desempenho
                      </h3>
                      <p className="text-xs opacity-40 mt-0.5">{chartLabel}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          <MoreVertical className="h-4 w-4 opacity-60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border/50 shadow-xl z-50">
                        <DropdownMenuItem
                          onClick={() => handlePreset(7)}
                          className={`gap-2 ${chartMode === 'preset' && chartDays === 7 ? 'text-accent font-semibold' : ''}`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          7 dias
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePreset(30)}
                          className={`gap-2 ${chartMode === 'preset' && chartDays === 30 ? 'text-accent font-semibold' : ''}`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Últimos 30 dias
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setChartMode('custom')}
                          className={`gap-2 ${chartMode === 'custom' ? 'text-accent font-semibold' : ''}`}
                        >
                          <CalendarRange className="h-3.5 w-3.5" />
                          Personalizado
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Custom date range picker */}
                  {chartMode === 'custom' && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn(
                            "h-8 text-xs gap-1.5 bg-white/5 border-white/10 hover:bg-white/10",
                            !customFrom && "text-white/40"
                          )}>
                            <Calendar className="h-3 w-3" />
                            {customFrom ? format(customFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'De'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border shadow-xl z-50" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customFrom}
                            onSelect={setCustomFrom}
                            disabled={(date) => date > new Date() || (customTo ? date > customTo : false)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="text-xs opacity-40">até</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn(
                            "h-8 text-xs gap-1.5 bg-white/5 border-white/10 hover:bg-white/10",
                            !customTo && "text-white/40"
                          )}>
                            <Calendar className="h-3 w-3" />
                            {customTo ? format(customTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Até'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border shadow-xl z-50" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customTo}
                            onSelect={setCustomTo}
                            disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  {chartData && chartData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 30%, 25%)" strokeOpacity={0.2} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: 'hsl(36, 40%, 60%)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(36, 40%, 60%)' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}K` : `R$ ${v}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(36, 70%, 50%)"
                            strokeWidth={3}
                            fill="url(#perfGrad)"
                            dot={{ fill: 'hsl(36, 70%, 50%)', r: 4, strokeWidth: 2, stroke: 'hsl(24, 50%, 15%)' }}
                            activeDot={{ r: 7, fill: 'hsl(36, 90%, 65%)', stroke: 'hsl(24, 50%, 15%)', strokeWidth: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Summary row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                        {[
                          { label: 'Vendas Hoje', value: String(kpis?.salesCount ?? 0) },
                          { label: 'Faturamento', value: fmtCurrency(kpis?.revenue ?? 0) },
                          { label: 'Ticket Médio', value: fmtCurrency(kpis?.avgTicket ?? 0) },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl px-4 py-3 text-center backdrop-blur-sm"
                            style={{ background: 'hsl(36 40% 95% / 0.06)' }}
                          >
                            <p className="text-xs opacity-50">{item.label}</p>
                            <p className="text-sm font-bold font-mono-numbers text-accent mt-0.5 glow-gold">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm opacity-40 text-center py-12">
                      Sem dados de vendas ainda
                    </p>
                  )}
                </div>
              </div>

              {/* ── Alerts Panel ── */}
              <div className="card-cinematic rounded-xl opacity-0 animate-fade-in" style={{ animationDelay: '450ms' }}>
                <div className="p-6">
                  <h3 className="text-base font-bold flex items-center gap-2 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <AlertTriangle className="h-4 w-4 text-accent" />
                    Alertas Ativos
                  </h3>
                  {!alerts?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Nenhum alerta ativo ✦
                    </p>
                  ) : (
                    <div className="relative space-y-0">
                      <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, hsl(36 70% 50% / 0.4), transparent)' }} />
                      {alerts.slice(0, 6).map((a: any) => (
                        <div key={a.id} className="relative flex items-start gap-3 py-2.5 pl-1 hover:translate-x-1 transition-transform duration-300">
                          <div className={`relative z-10 h-[10px] w-[10px] rounded-full mt-1.5 ring-4 ring-card ${
                            a.alert_type === 'validade_12h' ? 'bg-destructive animate-glow-pulse' :
                            a.alert_type === 'estoque_baixo' ? 'bg-warning' : 'bg-muted-foreground'
                          }`}
                          style={a.alert_type === 'validade_12h' ? { boxShadow: '0 0 8px hsl(0 72% 51% / 0.4)' } : a.alert_type === 'estoque_baixo' ? { boxShadow: '0 0 8px hsl(38 92% 50% / 0.3)' } : undefined}
                          />
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-[10px] mb-0.5">{a.alert_type}</Badge>
                            <p className="text-xs text-muted-foreground truncate">{a.message ?? a.recipes?.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Quick Access ── */}
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { label: 'Produtos', desc: 'Cadastrar e gerenciar', icon: ChefHat, path: '/recipes' },
            { label: 'Produção', desc: 'Registrar produção', icon: Coffee, path: '/production' },
            { label: 'Estoque', desc: 'Monitorar em tempo real', icon: Package, path: '/inventory' },
          ].map((item, i) => (
            <div
              key={item.path}
              className="card-cinematic rounded-xl cursor-pointer group opacity-0 animate-fade-in"
              style={{ animationDelay: `${550 + i * 80}ms` }}
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-5 p-6">
                <div className="rounded-2xl p-4 transition-all duration-500 group-hover:scale-110"
                  style={{ background: 'radial-gradient(circle, hsl(36 70% 50% / 0.12), hsl(24 60% 23% / 0.06))' }}>
                  <item.icon className="h-7 w-7 text-primary group-hover:text-accent transition-colors duration-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-accent transition-colors duration-300">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
