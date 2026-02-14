import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Loader2, Plus, Minus, X, Sparkles } from 'lucide-react';
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
        unit_price: 0,
        max_available: item.slices_available,
      }]);
    }
  };

  const total = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);

  const handleSale = async () => {
    if (!user || cart.length === 0) return;
    try {
      await createSale.mutateAsync({ operator_id: user.id, channel: channel as any, payment_method: payment as any, total, items: cart });
      toast.success('Venda registrada!');
      setCart([]);
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar venda'); }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground mt-1">Ponto de venda</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Products — 3 cols */}
          <div className="lg:col-span-3">
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="text-base">Produtos Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                {invLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : !availableItems.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem produtos em estoque.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group"
                      >
                        <div>
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">{item.recipes?.name}</p>
                          <Badge variant="secondary" className="text-[10px] mt-1">{item.slices_available} fatias</Badge>
                        </div>
                        <div className="rounded-full bg-primary/10 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart — 2 cols */}
          <div className="lg:col-span-2">
            <Card className="card-premium gradient-border sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" />
                  Carrinho ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Adicione produtos</p>
                  </div>
                ) : (
                  <>
                    {cart.map(item => (
                      <div key={item.inventory_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{item.recipe_name}</p>
                          <Input
                            type="number" className="w-24 h-7 text-xs" min={0} step="0.01"
                            value={item.unit_price}
                            onChange={e => setCart(cart.map(c => c.inventory_id === item.inventory_id ? { ...c, unit_price: parseFloat(e.target.value) || 0 } : c))}
                            placeholder="Preço"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            if (item.quantity > 1) setCart(cart.map(c => c.inventory_id === item.inventory_id ? { ...c, quantity: c.quantity - 1 } : c));
                            else setCart(cart.filter(c => c.inventory_id !== item.inventory_id));
                          }}><Minus className="h-3 w-3" /></Button>
                          <span className="font-mono-numbers text-sm w-6 text-center font-semibold">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            if (item.quantity < item.max_available) setCart(cart.map(c => c.inventory_id === item.inventory_id ? { ...c, quantity: c.quantity + 1 } : c));
                          }}><Plus className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCart(cart.filter(c => c.inventory_id !== item.inventory_id))}>
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

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-medium text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold font-mono-numbers text-gradient-gold"
                        style={{ WebkitTextFillColor: total > 0 ? undefined : 'hsl(24, 10%, 45%)' }}>
                        R$ {total.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      onClick={handleSale}
                      className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 gap-2"
                      disabled={createSale.isPending || total <= 0}
                    >
                      {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Finalizar Venda
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Today's sales */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Vendas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !todaySales?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada hoje.</p>
            ) : (
              <div className="space-y-2">
                {todaySales.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground font-mono-numbers">
                        {new Date(s.sold_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant="secondary">{channelLabels[s.channel] ?? s.channel}</Badge>
                      <span className="text-xs text-muted-foreground">{paymentLabels[s.payment_method]}</span>
                    </div>
                    <span className="font-mono-numbers font-semibold">R$ {Number(s.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Sales;
