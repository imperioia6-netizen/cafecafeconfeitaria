import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpDown } from 'lucide-react';
import { usePeriodReport, useProductionVsSales } from '@/hooks/useReports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery', ifood: 'iFood' };
const PIE_COLORS = ['hsl(24,60%,23%)', 'hsl(36,70%,50%)', 'hsl(142,60%,40%)', 'hsl(0,72%,51%)', 'hsl(210,60%,50%)'];

const PeriodTab = ({ days }: { days: number }) => {
  const { data, isLoading } = usePeriodReport(days);
  const { data: prodVsSales, isLoading: pvsLoading } = useProductionVsSales(days);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data) return null;

  const paymentData = Object.entries(data.byPayment).map(([name, value]) => ({
    name: paymentLabels[name] ?? name,
    value,
  }));
  const channelData = Object.entries(data.byChannel).map(([name, value]) => ({
    name: channelLabels[name] ?? name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-2xl font-bold font-mono">R$ {data.currentTotal.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-1">
              {data.growth >= 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={`text-xs font-medium ${data.growth >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}% vs período anterior
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Vendas</p>
            <p className="text-2xl font-bold">{data.salesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold font-mono">R$ {data.avgTicket.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Período Anterior</p>
            <p className="text-2xl font-bold font-mono text-muted-foreground">R$ {data.prevTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data.daily.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento Diário</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Total']} />
                  <Bar dataKey="total" fill="hsl(24,60%,23%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {paymentData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Por Forma de Pagamento</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="h-4 w-4" />
            Produção × Venda — Cruzamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pvsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !prodVsSales?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados de produção neste período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Produzido</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Sobra</TableHead>
                  <TableHead className="text-right">Perda %</TableHead>
                  <TableHead className="text-right">Custo Prod.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prodVsSales.map((r: any) => (
                  <TableRow key={r.recipe_id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right font-mono">{r.produced}</TableCell>
                    <TableCell className="text-right font-mono">{r.sold}</TableCell>
                    <TableCell className="text-right font-mono">{r.waste}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.wastePercent > 20 ? 'destructive' : 'secondary'} className="text-xs">
                        {r.wastePercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">R$ {r.prodCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">R$ {r.soldRevenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise de desempenho e cruzamento de dados</p>
        </div>

        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="7">7 dias</TabsTrigger>
            <TabsTrigger value="15">15 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
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
