import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const Inventory = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Controle em tempo real
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum produto em estoque ainda.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Inventory;
