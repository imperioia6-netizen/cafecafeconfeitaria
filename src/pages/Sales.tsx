import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Loader2, Plus, Minus, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useCreateSale, useTodaySales, type CartItem } from '@/hooks/useSales';
import { useAuth } from '@/hooks/useAuth';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';

const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery', ifood: 'iFood' };
const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };

const Sales = () => {
  const { user } = useAuth();
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { data: todaySales, isLoading: salesLoading } = useTodaySales();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<string>('balcao');
  const [payment, setPayment] = useState<string>('dinheiro');

  const availableItems = inventory?.filter(i => i.slices_available > 0) ?? [];

  const addToCart = (item: typeof availableItems[0]) => {
    const existing = cart.find(c => c.inventory_id === item.id);
    if (existing) {
      if (existing.quantity < item.slices_available) {
        setCart(cart.map(c => c.inventory_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
    } else {
      setCart([...cart, {
        recipe_id: item.recipe_id,
        recipe_name: item.recipes?.name ?? '—',
        inventory_id: item.id,
        quantity: 1,
        unit_price: 0, // will be set from recipe
        max_available: item.slices_available,
      }]);
    }
  };

  // Set unit prices from inventory recipes
  const enrichedCart = cart.map(c => {
    const inv = availableItems.find(i => i.id === c.inventory_id);
    // We need the sale_price — fetch from activeRecipes or inventory join
    // For now we'll use a simpler approach
    return c;
  });

  const total = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);

  const handleSale = async () => {
    if (!user || cart.length === 0) return;
    try {
      await createSale.mutateAsync({
        operator_id: user.id,
        channel: channel as any,
        payment_method: payment as any,
        total,
        items: cart,
      });
      toast.success('Venda registrada!');
      setCart([]);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar venda');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground mt-1">Registrar vendas e PDV</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Products available */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produtos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              {invLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : !availableItems.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem produtos em estoque.</p>
              ) : (
                <div className="space-y-2">
                  {availableItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{item.recipes?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.slices_available} fatias disponíveis</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addToCart(item)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                Carrinho ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Adicione produtos ao carrinho.</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.inventory_id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.recipe_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            className="w-20 h-8 text-sm"
                            min={0}
                            step="0.01"
                            value={item.unit_price}
                            onChange={e => setCart(cart.map(c => c.inventory_id === item.inventory_id ? { ...c, unit_price: parseFloat(e.target.value) || 0 } : c))}
                            placeholder="Preço"
                          />
                          <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          if (item.quantity > 1) setCart(cart.map(c => c.inventory_id === item.inventory_id ? { ...c, quantity: c.quantity - 1 } : c));
                          else setCart(cart.filter(c => c.inventory_id !== item.inventory_id));
                        }}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-mono text-sm w-6 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          if (item.quantity < item.max_available) setCart(cart.map(c => c.inventory_id === item.inventory_id ? { ...c, quantity: c.quantity + 1 } : c));
                        }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCart(cart.filter(c => c.inventory_id !== item.inventory_id))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Canal</Label>
                      <Select value={channel} onValueChange={setChannel}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Constants.public.Enums.sales_channel.map(c => (
                            <SelectItem key={c} value={c}>{channelLabels[c]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pagamento</Label>
                      <Select value={payment} onValueChange={setPayment}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Constants.public.Enums.payment_method.map(p => (
                            <SelectItem key={p} value={p}>{paymentLabels[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold font-mono">R$ {total.toFixed(2)}</span>
                  </div>

                  <Button onClick={handleSale} className="w-full" disabled={createSale.isPending || total <= 0}>
                    {createSale.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Finalizar Venda
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !todaySales?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada hoje.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySales.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.sold_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell><Badge variant="secondary">{channelLabels[s.channel] ?? s.channel}</Badge></TableCell>
                      <TableCell>{paymentLabels[s.payment_method] ?? s.payment_method}</TableCell>
                      <TableCell className="font-mono font-semibold">R$ {Number(s.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Sales;
