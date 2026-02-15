import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { usePeriodReport, useProductionVsSales } from '@/hooks/useReports';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const PIE_COLORS = ['hsl(24,60%,23%)', 'hsl(36,70%,50%)', 'hsl(142,60%,40%)', 'hsl(0,72%,51%)', 'hsl(210,60%,50%)'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-4 py-3 depth-shadow border-none">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold font-mono-numbers text-accent">R$ {payload[0].value.toFixed(2)}</p>
    </div>
  );
};

const PeriodTab = ({ days }: { days: number }) => {
  const { data, isLoading } = usePeriodReport(days);
  const { data: prodVsSales, isLoading: pvsLoading } = useProductionVsSales(days);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data) return null;

  const paymentData = Object.entries(data.byPayment).map(([name, value]) => ({ name: paymentLabels[name] ?? name, value }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Faturamento', value: `R$ ${data.currentTotal.toFixed(2)}`, trend: data.growth },
          { label: 'Vendas', value: String(data.salesCount) },
          { label: 'Ticket Médio', value: `R$ ${data.avgTicket.toFixed(2)}` },
          { label: 'Período Anterior', value: `R$ ${data.prevTotal.toFixed(2)}`, muted: true },
        ].map((kpi, i) => (
          <div key={kpi.label} className="card-cinematic shine-effect gradient-border rounded-xl opacity-0 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="p-5 relative z-10">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.15em]">{kpi.label}</p>
              <p className={`text-2xl font-bold font-mono-numbers mt-1 ${kpi.muted ? 'text-muted-foreground' : ''}`}>{kpi.value}</p>
              {kpi.trend !== undefined && (
                <div className="flex items-center gap-1 mt-1.5">
                  {kpi.trend >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className={`text-xs font-medium ${kpi.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {kpi.trend >= 0 ? '+' : ''}{kpi.trend.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data.daily.length > 0 && (
          <div className="card-cinematic rounded-xl">
            <div className="p-6">
              <h3 className="text-base font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Faturamento Diário</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 90%)" strokeOpacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(24, 10%, 45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(24, 10%, 45%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="hsl(36, 70%, 50%)" strokeWidth={2.5} fill="url(#reportGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {paymentData.length > 0 && (
          <div className="card-cinematic rounded-xl">
            <div className="p-6">
              <h3 className="text-base font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Por Forma de Pagamento</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'hsl(24, 10%, 45%)' }}>
                    {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Production vs Sales */}
      <div className="card-cinematic rounded-xl">
        <div className="p-6">
          <h3 className="flex items-center gap-2 text-base font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <ArrowUpDown className="h-4 w-4 text-accent" /> Produção × Venda
          </h3>
          {pvsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !prodVsSales?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados neste período.</p>
          ) : (
            <div className="space-y-2">
              {prodVsSales.map((r: any) => (
                <div key={r.recipe_id} className="flex items-center justify-between p-4 rounded-xl border border-border/20 hover:border-accent/20 hover:shadow-md transition-all duration-300 group"
                  style={{ borderLeft: '3px solid hsl(36 70% 50% / 0.3)' }}>
                  <div className="flex-1">
                    <p className="font-semibold text-sm group-hover:text-accent transition-colors">{r.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Prod: <strong className="font-mono-numbers">{r.produced}</strong></span>
                      <span>Venda: <strong className="font-mono-numbers">{r.sold}</strong></span>
                      <span>Sobra: <strong className="font-mono-numbers">{r.waste}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={r.wastePercent > 20 ? 'destructive' : 'secondary'}
                      className={`text-xs ${r.wastePercent > 20 ? 'glow-destructive' : ''}`}>
                      {r.wastePercent.toFixed(1)}% perda
                    </Badge>
                    <span className="font-mono-numbers font-semibold text-sm">R$ {r.soldRevenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const [period, setPeriod] = useState('7');

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Análise de desempenho</p>
        </div>

        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-transparent border border-border/30 p-1 gap-1">
            {['7', '15', '30'].map(v => (
              <TabsTrigger key={v} value={v}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none relative transition-all"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {v} dias
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all data-[state=active]:bg-accent"
                  style={{ background: period === v ? 'hsl(36 70% 50%)' : 'transparent', boxShadow: period === v ? '0 0 8px hsl(36 70% 50% / 0.3)' : 'none' }} />
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="7"><PeriodTab days={7} /></TabsContent>
          <TabsContent value="15"><PeriodTab days={15} /></TabsContent>
          <TabsContent value="30"><PeriodTab days={30} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
