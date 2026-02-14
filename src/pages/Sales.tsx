import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

const Sales = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Registrar vendas e PDV
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Nova Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Cadastre receitas e registre produção para começar a vender.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Sales;
