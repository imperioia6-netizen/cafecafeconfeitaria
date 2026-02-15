import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  ClipboardList, Plus, Minus, X, Loader2, Sparkles, Trash2, CreditCard, Hash, User, MapPin, Search, ShoppingBag, ChevronRight,
} from 'lucide-react';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { useOpenOrders, useCreateOrder, useAddOrderItem, useRemoveOrderItem, useFinalizeOrder, useCancelOrder } from '@/hooks/useOrders';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';

const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery' };
const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const categoryLabels: Record<string, string> = { bolo: 'Bolos', torta: 'Tortas', salgado: 'Salgados', bebida: 'Bebidas', doce: 'Doces', outro: 'Outros' };
const categoryEmoji: Record<string, string> = { bolo: '🎂', torta: '🥧', salgado: '🥟', bebida: '🥤', doce: '🍫', outro: '📦' };

interface NewOrderItem {
  recipe_id: string;
  recipe_name: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  max_available: number;
  photo_url?: string | null;
}

const Orders = () => {
  const { user } = useAuth();
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { data: openOrders, isLoading: ordersLoading } = useOpenOrders();
  const createOrder = useCreateOrder();
  const removeOrderItem = useRemoveOrderItem();
  const finalizeOrder = useFinalizeOrder();
  const cancelOrder = useCancelOrder();

  const [cart, setCart] = useState<NewOrderItem[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState('balcao');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todos');

  const [finalizeTarget, setFinalizeTarget] = useState<any>(null);
  const [payment, setPayment] = useState('dinheiro');

  const availableItems = inventory?.filter(i => i.slices_available > 0) ?? [];

  // Categories from available items
  const categories = useMemo(() => {
    const cats = new Set(availableItems.map(i => i.recipes?.category ?? 'outro'));
    return ['todos', ...Array.from(cats)];
  }, [availableItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = availableItems;
    if (activeCategory !== 'todos') {
      items = items.filter(i => (i.recipes?.category ?? 'outro') === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.recipes?.name?.toLowerCase().includes(q));
    }
    return items;
  }, [availableItems, activeCategory, searchQuery]);

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
        photo_url: item.recipes?.photo_url,
      }]);
    }
  };

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Cardápio</h1>
            <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Monte o pedido do cliente</p>
          </div>
          {openOrders && openOrders.length > 0 && (
            <Badge className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
              {openOrders.length} pedido{openOrders.length > 1 ? 's' : ''} aberto{openOrders.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Order metadata bar */}
        <div className="glass-card rounded-2xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Comanda</Label>
              <Input className="h-9 text-sm rounded-xl border-border/30 bg-background/50" placeholder="Nº comanda" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Mesa</Label>
              <Input className="h-9 text-sm rounded-xl border-border/30 bg-background/50" placeholder="Nº mesa" value={tableNumber} onChange={e => setTableNumber(e.target.value)} maxLength={10} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Cliente</Label>
              <Input className="h-9 text-sm rounded-xl border-border/30 bg-background/50" placeholder="Nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9 rounded-xl border-border/30 bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.sales_channel.filter(c => c !== 'ifood').map(c => (
                    <SelectItem key={c} value={c}>{channelLabels[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
          <Input
            className="h-12 pl-12 rounded-2xl text-sm border-border/30 bg-card/80 backdrop-blur-sm shadow-sm"
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category pills */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'text-primary-foreground shadow-md scale-105'
                      : 'bg-card/80 text-muted-foreground hover:bg-card border border-border/30'
                  }`}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                    boxShadow: '0 4px 16px hsl(var(--primary) / 0.3)',
                  } : undefined}
                >
                  {cat === 'todos' ? '🍽️' : categoryEmoji[cat] ?? '📦'}
                  <span>{cat === 'todos' ? 'Todos' : categoryLabels[cat] ?? cat}</span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Product grid — iFood style */}
        {invLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !filteredItems.length ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground/60 text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.inventory_id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="group relative bg-card/90 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-accent/30 hover:-translate-y-1 active:scale-[0.98]"
                >
                  {/* Product image */}
                  <div className="relative aspect-[16/10] w-full bg-muted/20 overflow-hidden">
                    {item.recipes?.photo_url ? (
                      <img
                        src={item.recipes.photo_url}
                        alt={item.recipes?.name ?? ''}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                        <span className="text-4xl opacity-30">{categoryEmoji[item.recipes?.category ?? 'outro'] ?? '📦'}</span>
                      </div>
                    )}
                    {/* Availability badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className="text-[10px] font-semibold rounded-full bg-card/90 backdrop-blur-md text-foreground border-0 shadow-sm">
                        {item.slices_available} disponíveis
                      </Badge>
                    </div>
                    {/* Cart indicator */}
                    {inCart && (
                      <div className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
                        {inCart.quantity}
                      </div>
                    )}
                    {/* Add overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <span className="text-primary-foreground text-sm font-semibold flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Adicionar
                      </span>
                    </div>
                  </div>
                  {/* Product info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {item.recipes?.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {categoryLabels[item.recipes?.category ?? 'outro'] ?? item.recipes?.category}
                        </p>
                      </div>
                      <span className="text-base font-bold font-mono-numbers text-gradient-gold whitespace-nowrap">
                        R$ {Number(item.recipes?.sale_price ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Floating cart bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:pl-[calc(var(--sidebar-width,16rem)+1rem)] md:pr-4">
            <div
              className="mx-auto max-w-3xl rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xl border border-border/20 backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.95), hsl(24 50% 18% / 0.95))',
                boxShadow: '0 -4px 40px hsl(var(--primary) / 0.3), 0 8px 32px hsl(0 0% 0% / 0.3)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="h-6 w-6 text-accent" />
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-accent text-accent-foreground">
                    {cartCount}
                  </span>
                </div>
                <div>
                  <p className="text-primary-foreground/70 text-xs">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
                  <p className="text-primary-foreground font-bold font-mono-numbers text-lg">
                    R$ {cartTotal.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCreateOrder}
                disabled={createOrder.isPending}
                className="h-12 px-6 rounded-xl text-sm font-semibold gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
              >
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Abrir Pedido
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Open Orders section */}
        {(ordersLoading || (openOrders && openOrders.length > 0)) && (
          <div className="space-y-4 pb-24">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Pedidos Abertos
            </h2>
            {ordersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openOrders!.map((order: any) => {
                  const orderTotal = (order.order_items || []).reduce((s: number, i: any) => s + Number(i.subtotal), 0);
                  return (
                    <div key={order.id} className="glass-card rounded-2xl overflow-hidden">
                      {/* Order header stripe */}
                      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.05))' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.order_number && (
                            <Badge variant="outline" className="text-[10px] border-accent/40 text-accent font-semibold rounded-full">
                              #{order.order_number}
                            </Badge>
                          )}
                          {order.table_number && (
                            <Badge className="text-[10px] bg-muted/50 text-muted-foreground rounded-full border-0">Mesa {order.table_number}</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono-numbers">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        {order.customer_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3" /> {order.customer_name}
                          </p>
                        )}

                        {/* Items */}
                        <div className="space-y-2">
                          {(order.order_items || []).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm group/item">
                              <div className="flex items-center gap-2.5">
                                <span className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-bold font-mono-numbers text-muted-foreground">
                                  {item.quantity}×
                                </span>
                                <span className="text-foreground/90 truncate text-sm">{item.recipes?.name ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono-numbers text-xs text-muted-foreground">R$ {Number(item.subtotal).toFixed(2)}</span>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover/item:opacity-100 text-destructive/60 hover:text-destructive transition-opacity"
                                  onClick={() => removeOrderItem.mutate(item.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Total + actions */}
                        <div className="pt-3 border-t border-border/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Total</span>
                            <span className="font-bold font-mono-numbers text-lg text-gradient-gold">R$ {orderTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm" variant="ghost"
                              className="text-xs text-destructive/70 hover:text-destructive flex-1 rounded-xl"
                              onClick={() => handleCancel(order.id)}
                              disabled={cancelOrder.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs gap-1 flex-1 rounded-xl text-primary-foreground"
                              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                              onClick={() => { setFinalizeTarget(order); setPayment('dinheiro'); }}
                            >
                              <CreditCard className="h-3 w-3" /> Finalizar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Spacer when cart is open */}
        {cart.length > 0 && <div className="h-24" />}
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
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
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
