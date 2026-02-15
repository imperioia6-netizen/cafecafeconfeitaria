import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBasket, Store, AlertTriangle } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useAlertCount } from '@/hooks/useAlerts';
import { useIngredientStock } from '@/hooks/useIngredientStock';
import EstoqueTab from '@/components/inventory/EstoqueTab';
import VitrineTab from '@/components/inventory/VitrineTab';
import AlertasTab from '@/components/inventory/AlertasTab';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('estoque');
  const { data: alertCount } = useAlertCount();
  const { data: inventory } = useInventory();
  const { data: ingredients } = useIngredientStock();

  const tabStyle = (tab: string) =>
    activeTab === tab ? { background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' } : undefined;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Controle em tempo real</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/30 p-1 rounded-full border border-border/30 overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger
              value="estoque"
              className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-500 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              style={tabStyle('estoque')}
            >
              <ShoppingBasket className="h-4 w-4 mr-2" />
              Estoque ({ingredients?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="vitrine"
              className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-500 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              style={tabStyle('vitrine')}
            >
              <Store className="h-4 w-4 mr-2" />
              Vitrine ({inventory?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="alertas"
              className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-500 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              style={tabStyle('alertas')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alertas
              {(alertCount ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-[10px] glow-destructive">
                  {alertCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estoque"><EstoqueTab /></TabsContent>
          <TabsContent value="vitrine"><VitrineTab /></TabsContent>
          <TabsContent value="alertas"><AlertasTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Inventory;
