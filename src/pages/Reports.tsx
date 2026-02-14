import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { usePeriodReport, useProductionVsSales } from '@/hooks/useReports';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery', ifood: 'iFood' };
const PIE_COLORS = ['hsl(24,60%,23%)', 'hsl(36,70%,50%)', 'hsl(142,60%,40%)', 'hsl(0,72%,51%)', 'hsl(210,60%,50%)'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-4 py-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold font-mono-numbers">R$ {payload[0].value.toFixed(2)}</p>
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
          <Card key={kpi.label} className={`card-premium gradient-border opacity-0 animate-fade-in`} style={{ animationDelay: `${i * 100}ms` }}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-2xl font-bold font-mono-numbers mt-1 ${kpi.muted ? 'text-muted-foreground' : ''}`}>{kpi.value}</p>
              {kpi.trend !== undefined && (
                <div className="flex items-center gap-1 mt-1.5">
                  {kpi.trend >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className={`text-xs font-medium ${kpi.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {kpi.trend >= 0 ? '+' : ''}{kpi.trend.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data.daily.length > 0 && (
          <Card className="card-premium">
            <CardHeader><CardTitle className="text-base">Faturamento Diário</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(36, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(24, 10%, 45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(24, 10%, 45%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="hsl(36, 70%, 50%)" strokeWidth={2.5} fill="url(#reportGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {paymentData.length > 0 && (
          <Card className="card-premium">
            <CardHeader><CardTitle className="text-base">Por Forma de Pagamento</CardTitle></CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Production vs Sales */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="h-4 w-4" /> Produção × Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pvsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !prodVsSales?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados neste período.</p>
          ) : (
            <div className="space-y-2">
              {prodVsSales.map((r: any) => (
                <div key={r.recipe_id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{r.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Prod: <strong className="font-mono-numbers">{r.produced}</strong></span>
                      <span>Venda: <strong className="font-mono-numbers">{r.sold}</strong></span>
                      <span>Sobra: <strong className="font-mono-numbers">{r.waste}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={r.wastePercent > 20 ? 'destructive' : 'secondary'} className="text-xs">
                      {r.wastePercent.toFixed(1)}% perda
                    </Badge>
                    <span className="font-mono-numbers font-semibold text-sm">R$ {r.soldRevenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Reports = () => {
  const [period, setPeriod] = useState('7');

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise de desempenho</p>
        </div>

        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="7" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">7 dias</TabsTrigger>
            <TabsTrigger value="15" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">15 dias</TabsTrigger>
            <TabsTrigger value="30" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">30 dias</TabsTrigger>
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
