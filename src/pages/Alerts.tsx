import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const Alerts = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Estoque baixo, validade e desperdício
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum alerta no momento ✦
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Alerts;
