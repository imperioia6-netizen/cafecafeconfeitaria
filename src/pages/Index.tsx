import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
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
} from 'lucide-react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: string;
}) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {title}
      </CardTitle>
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className="text-xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
            {trend}
          </span>
        )}
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { isOwner } = useAuth();

  if (!isOwner) return <Navigate to="/production" replace />;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Visão geral do Café Café — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Faturamento Hoje"
            value="R$ 0,00"
            subtitle="vs ontem"
            icon={DollarSign}
            trend="+0%"
          />
          <StatCard
            title="Vendas Hoje"
            value="0"
            subtitle="balcão + delivery"
            icon={ShoppingCart}
          />
          <StatCard
            title="Ticket Médio"
            value="R$ 0,00"
            subtitle="média por venda"
            icon={TrendingUp}
          />
          <StatCard
            title="Estoque Crítico"
            value="0"
            subtitle="produtos em alerta"
            icon={AlertTriangle}
          />
        </div>

        {/* Quick Access Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-xl bg-primary/10 p-3">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>Receitas</h3>
                <p className="text-sm text-muted-foreground">Cadastrar e gerenciar produtos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-xl bg-accent/20 p-3">
                <Coffee className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>Produção</h3>
                <p className="text-sm text-muted-foreground">Registrar produção do dia</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-xl bg-destructive/10 p-3">
                <Package className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>Estoque</h3>
                <p className="text-sm text-muted-foreground">Monitorar em tempo real</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>Nenhum alerta no momento ✦</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
