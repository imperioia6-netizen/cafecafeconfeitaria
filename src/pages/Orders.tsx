import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  ClipboardList, Plus, Minus, X, Loader2, Sparkles, Trash2, CreditCard, Hash, User, MapPin,
} from 'lucide-react';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { useOpenOrders, useCreateOrder, useAddOrderItem, useRemoveOrderItem, useFinalizeOrder, useCancelOrder } from '@/hooks/useOrders';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';

const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery' };
const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };

interface NewOrderItem {
  recipe_id: string;
  recipe_name: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  max_available: number;
}

const Orders = () => {
  const { user } = useAuth();
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { data: openOrders, isLoading: ordersLoading } = useOpenOrders();
  const createOrder = useCreateOrder();
  const addOrderItem = useAddOrderItem();
  const removeOrderItem = useRemoveOrderItem();
  const finalizeOrder = useFinalizeOrder();
  const cancelOrder = useCancelOrder();

  // New order state
  const [cart, setCart] = useState<NewOrderItem[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState('balcao');

  // Finalize dialog
  const [finalizeTarget, setFinalizeTarget] = useState<any>(null);
  const [payment, setPayment] = useState('dinheiro');

  const availableItems = inventory?.filter(i => i.slices_available > 0) ?? [];

  const addToCart = (item: InventoryItem) => {
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
        unit_price: item.recipes?.sale_price ?? 0,
        max_available: item.slices_available,
      }]);
    }
  };

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);

  const handleCreateOrder = async () => {
    if (!user || cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        operator_id: user.id,
        order_number: orderNumber || undefined,
        table_number: tableNumber || undefined,
        customer_name: customerName || undefined,
        channel,
        items: cart.map(c => ({
          recipe_id: c.recipe_id,
          inventory_id: c.inventory_id,
          quantity: c.quantity,
          unit_price: c.unit_price,
        })),
      });
      toast.success('Pedido criado!');
      setCart([]);
      setOrderNumber('');
      setTableNumber('');
      setCustomerName('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar pedido');
    }
  };

  const handleFinalize = async () => {
    if (!finalizeTarget || !user) return;
    try {
      await finalizeOrder.mutateAsync({
        order: finalizeTarget,
        payment_method: payment,
        operator_id: user.id,
      });
      toast.success('Pedido finalizado e venda registrada!');
      setFinalizeTarget(null);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao finalizar pedido');
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await cancelOrder.mutateAsync(orderId);
      toast.success('Pedido cancelado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Pedidos</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Comandas em andamento</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Product catalog — left */}
          <div className="lg:col-span-3 space-y-6">
            <div className="card-cinematic rounded-xl">
              <div className="p-6">
                <h3 className="text-base font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Novo Pedido
                </h3>

                {/* Order metadata */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Comanda</Label>
                    <Input className="h-8 text-xs" placeholder="Nº" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} maxLength={20} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Mesa</Label>
                    <Input className="h-8 text-xs" placeholder="Nº" value={tableNumber} onChange={e => setTableNumber(e.target.value)} maxLength={10} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Cliente</Label>
                    <Input className="h-8 text-xs" placeholder="Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100} />
                  </div>
                </div>

                {/* Product grid */}
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
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-accent/30 transition-all duration-500 text-left group hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5"
                        style={{ background: 'hsl(var(--card) / 0.6)' }}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted/30">
                          {item.recipes?.photo_url ? (
                            <img src={item.recipes.photo_url} alt={item.recipes?.name ?? ''} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">📷</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm group-hover:text-accent transition-colors duration-300 truncate">{item.recipes?.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px]" style={{ background: 'linear-gradient(135deg, hsl(36 70% 50% / 0.1), hsl(24 60% 23% / 0.05))' }}>
                              {item.slices_available} fatias
                            </Badge>
                            {(item.recipes?.sale_price ?? 0) > 0 && (
                              <span className="text-[11px] font-mono-numbers text-accent/80 font-semibold">
                                R$ {Number(item.recipes!.sale_price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 flex-shrink-0" style={{ background: 'hsl(36 70% 50% / 0.1)' }}>
                          <Plus className="h-4 w-4 text-accent" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart for new order */}
            {cart.length > 0 && (
              <div className="card-cinematic gradient-border rounded-xl">
                <div className="p-6 space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <ClipboardList className="h-4 w-4 text-accent" /> Itens do Pedido ({cart.length})
                  </h3>
                  {cart.map(item => (
                    <div key={item.inventory_id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 glass">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.recipe_name}</p>
                        <p className="text-xs text-muted-foreground">R$ {item.unit_price.toFixed(2)} un.</p>
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
                  <div className="flex items-center justify-between pt-3 border-t border-border/20">
                    <span className="text-sm text-muted-foreground">Total parcial</span>
                    <span className="text-xl font-bold font-mono-numbers text-gradient-gold">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    onClick={handleCreateOrder}
                    className="w-full h-11 text-sm font-semibold shine-effect gap-2"
                    style={{
                      background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%), hsl(24 60% 23%))',
                      boxShadow: '0 4px 24px hsl(24 60% 23% / 0.35)',
                    }}
                    disabled={createOrder.isPending || cart.length === 0}
                  >
                    {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                    Abrir Pedido
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Open orders — right */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Pedidos Abertos ({openOrders?.length ?? 0})
            </h3>
            {ordersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !openOrders?.length ? (
              <div className="card-cinematic rounded-xl p-8 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/60">Nenhum pedido aberto</p>
              </div>
            ) : (
              openOrders.map((order: any) => {
                const orderTotal = (order.order_items || []).reduce((s: number, i: any) => s + Number(i.subtotal), 0);
                return (
                  <div key={order.id} className="card-cinematic rounded-xl">
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.order_number && (
                            <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">
                              #{order.order_number}
                            </Badge>
                          )}
                          {order.table_number && (
                            <Badge variant="secondary" className="text-[10px]">Mesa {order.table_number}</Badge>
                          )}
                          {order.customer_name && (
                            <span className="text-xs text-muted-foreground">{order.customer_name}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono-numbers">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {(order.order_items || []).map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-mono-numbers text-xs text-muted-foreground w-5">{item.quantity}x</span>
                              <span className="truncate">{item.recipes?.name ?? '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-numbers text-xs">R$ {Number(item.subtotal).toFixed(2)}</span>
                              <Button
                                size="icon" variant="ghost" className="h-6 w-6 text-destructive/60 hover:text-destructive"
                                onClick={() => removeOrderItem.mutate(item.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total + actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/20">
                        <span className="font-bold font-mono-numbers text-lg text-gradient-gold">R$ {orderTotal.toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm" variant="ghost"
                            className="text-xs text-destructive/70 hover:text-destructive"
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelOrder.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs gap-1"
                            style={{
                              background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
                            }}
                            onClick={() => { setFinalizeTarget(order); setPayment('dinheiro'); }}
                          >
                            <CreditCard className="h-3 w-3" /> Finalizar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Finalize dialog */}
      <Dialog open={!!finalizeTarget} onOpenChange={open => !open && setFinalizeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>
              {finalizeTarget?.order_number ? `Comanda #${finalizeTarget.order_number}` : 'Pedido'}
              {finalizeTarget?.table_number ? ` — Mesa ${finalizeTarget.table_number}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-2">
              <span className="text-3xl font-bold font-mono-numbers text-gradient-gold">
                R$ {finalizeTarget ? (finalizeTarget.order_items || []).reduce((s: number, i: any) => s + Number(i.subtotal), 0).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Método de Pagamento</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.payment_method.map(p => (
                    <SelectItem key={p} value={p}>{paymentLabels[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinalizeTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizeOrder.isPending}
              className="gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
              }}
            >
              {finalizeOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Orders;
