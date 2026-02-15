import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ClipboardList, Plus, Minus, X, Loader2, Sparkles, Trash2, CreditCard, Hash, User, MapPin, Search, ShoppingBag, ShoppingCart, Eye, Pencil, MessageSquare,
} from 'lucide-react';
import { useActiveRecipes, type Recipe } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { useOpenOrders, useCreateOrder, useRemoveOrderItem, useFinalizeOrder, useCancelOrder } from '@/hooks/useOrders';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';

const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery' };
const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const categoryLabels: Record<string, string> = { bolo: 'Bolos', torta: 'Tortas', salgado: 'Salgados', bebida: 'Bebidas', doce: 'Doces', outro: 'Outros' };
const categoryEmoji: Record<string, string> = { bolo: '🎂', torta: '🥧', salgado: '🥟', bebida: '🥤', doce: '🍫', outro: '📦' };

interface NewOrderItem {
  recipe_id: string;
  recipe_name: string;
  quantity: number;
  unit_price: number;
  photo_url?: string | null;
  category: string;
  notes?: string;
}

const Orders = () => {
  const { user } = useAuth();
  const { data: recipes, isLoading: recipesLoading } = useActiveRecipes();
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

  const [activeTab, setActiveTab] = useState('cardapio');
  const [finalizeTarget, setFinalizeTarget] = useState<any>(null);
  const [payment, setPayment] = useState('dinheiro');

  // Product dialog state
  const [selectedProduct, setSelectedProduct] = useState<Recipe | null>(null);
  const [dialogQty, setDialogQty] = useState(1);
  const [dialogNotes, setDialogNotes] = useState('');

  // Cart sheet state
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const allRecipes = recipes ?? [];

  const categories = useMemo(() => {
    const cats = new Set(allRecipes.map(r => r.category ?? 'outro'));
    return ['todos', ...Array.from(cats)];
  }, [allRecipes]);

  const filteredItems = useMemo(() => {
    let items = allRecipes;
    if (activeCategory !== 'todos') {
      items = items.filter(r => (r.category ?? 'outro') === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(r => r.name.toLowerCase().includes(q));
    }
    return items;
  }, [allRecipes, activeCategory, searchQuery]);

  // Open product dialog
  const openProductDialog = (recipe: Recipe) => {
    const existing = cart.find(c => c.recipe_id === recipe.id);
    setSelectedProduct(recipe);
    setDialogQty(existing?.quantity ?? 1);
    setDialogNotes(existing?.notes ?? '');
  };

  // Confirm add/update from dialog
  const confirmProduct = () => {
    if (!selectedProduct) return;
    const existing = cart.find(c => c.recipe_id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(c => c.recipe_id === selectedProduct.id ? { ...c, quantity: dialogQty, notes: dialogNotes } : c));
    } else {
      setCart([...cart, {
        recipe_id: selectedProduct.id,
        recipe_name: selectedProduct.name,
        quantity: dialogQty,
        unit_price: Number(selectedProduct.sale_price),
        photo_url: selectedProduct.photo_url,
        category: selectedProduct.category,
        notes: dialogNotes,
      }]);
    }
    setSelectedProduct(null);
  };

  // Edit item from cart sheet
  const editCartItem = (item: NewOrderItem) => {
    const recipe = allRecipes.find(r => r.id === item.recipe_id);
    if (recipe) {
      setCartSheetOpen(false);
      openProductDialog(recipe);
    }
  };

  const removeFromCart = (recipeId: string) => {
    setCart(cart.filter(c => c.recipe_id !== recipeId));
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
          quantity: c.quantity,
          unit_price: c.unit_price,
          notes: c.notes || undefined,
        })),
      });
      toast.success('Pedido criado!');
      setCart([]);
      setOrderNumber('');
      setTableNumber('');
      setCustomerName('');
      setCartSheetOpen(false);
      setActiveTab('pedidos');
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

  const isInCart = (recipeId: string) => cart.find(c => c.recipe_id === recipeId);

  return (
    <AppLayout>
      <div className="space-y-6 pb-28">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="cardapio" className="rounded-lg text-sm font-semibold gap-2 data-[state=active]:shadow-md">
              <ShoppingBag className="h-4 w-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="rounded-lg text-sm font-semibold gap-2 data-[state=active]:shadow-md">
              <ClipboardList className="h-4 w-4" />
              Pedidos Abertos
              {openOrders && openOrders.length > 0 && (
                <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] rounded-full ml-1" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
                  {openOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cardapio" className="mt-4 space-y-4">
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

            {/* Product grid */}
            {recipesLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !filteredItems.length ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground/60 text-sm">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map(recipe => {
                  const inCart = isInCart(recipe.id);
                  return (
                    <button
                      key={recipe.id}
                      onClick={() => openProductDialog(recipe)}
                      className="group relative bg-card/90 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-accent/30 hover:-translate-y-1 active:scale-[0.98]"
                    >
                      <div className="relative aspect-[16/10] w-full bg-muted/20 overflow-hidden">
                        {recipe.photo_url ? (
                          <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                            <span className="text-4xl opacity-30">{categoryEmoji[recipe.category ?? 'outro'] ?? '📦'}</span>
                          </div>
                        )}
                        {inCart && (
                          <div className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
                            {inCart.quantity}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                          <span className="text-primary-foreground text-sm font-semibold flex items-center gap-1">
                            <Plus className="h-4 w-4" /> {inCart ? 'Editar' : 'Adicionar'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {recipe.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {categoryLabels[recipe.category ?? 'outro'] ?? recipe.category}
                            </p>
                          </div>
                          <span className="text-base font-bold font-mono-numbers text-gradient-gold whitespace-nowrap">
                            R$ {Number(recipe.sale_price).toFixed(2)}
                          </span>
                        </div>
                        {inCart?.notes && (
                          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 truncate">
                            <MessageSquare className="h-3 w-3 shrink-0" /> {inCart.notes}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pedidos" className="mt-4 space-y-4">
            {ordersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !openOrders || openOrders.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground/60 text-sm">Nenhum pedido aberto</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openOrders.map((order: any) => {
                  const orderTotal = (order.order_items || []).reduce((s: number, i: any) => s + Number(i.subtotal), 0);
                  return (
                    <div key={order.id} className="glass-card rounded-2xl overflow-hidden">
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
                        <div className="space-y-2">
                          {(order.order_items || []).map((item: any) => (
                            <div key={item.id} className="group/item">
                              <div className="flex items-center justify-between text-sm">
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
                              {item.notes && (
                                <p className="text-[10px] text-muted-foreground/70 ml-8.5 mt-0.5 flex items-center gap-1 italic">
                                  <MessageSquare className="h-2.5 w-2.5 shrink-0" /> {item.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== FLOATING CART BAR ===== */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 md:pl-[calc(var(--sidebar-width,280px)+1rem)]">
          <div
            className="max-w-3xl mx-auto rounded-2xl border border-border/30 backdrop-blur-xl shadow-2xl px-5 py-3.5 flex items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.95))' }}
          >
            <button
              onClick={() => setCartSheetOpen(true)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground relative"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
                <p className="font-bold font-mono-numbers text-foreground">R$ {cartTotal.toFixed(2)}</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs gap-1"
                onClick={() => setCartSheetOpen(true)}
              >
                <Eye className="h-3.5 w-3.5" /> Ver
              </Button>
              <Button
                size="sm"
                className="rounded-xl text-xs gap-1.5 px-5 text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                onClick={handleCreateOrder}
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Criar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCT DIALOG ===== */}
      <Dialog open={!!selectedProduct} onOpenChange={open => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          {selectedProduct && (() => {
            const inCart = isInCart(selectedProduct.id);
            const subtotal = dialogQty * Number(selectedProduct.sale_price);
            return (
              <>
                {/* Product image */}
                <div className="relative aspect-[16/10] w-full bg-muted/20 overflow-hidden">
                  {selectedProduct.photo_url ? (
                    <img src={selectedProduct.photo_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                      <span className="text-6xl opacity-30">{categoryEmoji[selectedProduct.category ?? 'outro'] ?? '📦'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5">
                    <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">{categoryLabels[selectedProduct.category ?? 'outro']}</p>
                  </div>
                </div>

                <div className="px-5 pb-5 space-y-5">
                  {/* Price */}
                  <div className="text-center">
                    <span className="text-2xl font-bold font-mono-numbers text-gradient-gold">
                      R$ {Number(selectedProduct.sale_price).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">/ unidade</span>
                  </div>

                  {/* Quantity control */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantidade</Label>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-xl border-border/40"
                        onClick={() => setDialogQty(Math.max(1, dialogQty - 1))}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={dialogQty}
                        onChange={e => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v > 0) setDialogQty(v);
                        }}
                        className="w-20 h-11 text-center text-lg font-bold font-mono-numbers rounded-xl border-border/40"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-xl border-border/40"
                        onClick={() => setDialogQty(dialogQty + 1)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Observações
                    </Label>
                    <Textarea
                      placeholder="Ex: sem açúcar, metade morango, fatia grande..."
                      value={dialogNotes}
                      onChange={e => setDialogNotes(e.target.value)}
                      className="rounded-xl border-border/30 bg-background/50 resize-none min-h-[70px] text-sm"
                      maxLength={300}
                    />
                  </div>

                  {/* Action button */}
                  <Button
                    className="w-full h-12 rounded-xl text-sm font-semibold gap-2 text-primary-foreground"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                    onClick={confirmProduct}
                  >
                    {inCart ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {inCart ? 'Atualizar' : 'Adicionar'} — R$ {subtotal.toFixed(2)}
                  </Button>

                  {inCart && (
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-destructive/70 hover:text-destructive rounded-xl"
                      onClick={() => { removeFromCart(selectedProduct.id); setSelectedProduct(null); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover do pedido
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== CART REVIEW SHEET ===== */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent className="sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-5 pb-3 border-b border-border/20">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Resumo do Pedido
            </SheetTitle>
            <SheetDescription>
              {cartCount} {cartCount === 1 ? 'item' : 'itens'} · R$ {cartTotal.toFixed(2)}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-5">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground/60 text-sm">Carrinho vazio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.recipe_id} className="bg-muted/20 rounded-xl p-3.5 space-y-2 border border-border/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.recipe_name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                            <span className="text-lg">{categoryEmoji[item.category ?? 'outro'] ?? '📦'}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{item.recipe_name}</h4>
                          <p className="text-xs text-muted-foreground font-mono-numbers">
                            {item.quantity}× R$ {item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold font-mono-numbers text-sm text-foreground whitespace-nowrap">
                        R$ {(item.quantity * item.unit_price).toFixed(2)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 italic pl-1">
                        <MessageSquare className="h-3 w-3 shrink-0" /> {item.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 rounded-lg gap-1 flex-1"
                        onClick={() => editCartItem(item)}
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 rounded-lg gap-1 flex-1 text-destructive/70 hover:text-destructive"
                        onClick={() => removeFromCart(item.recipe_id)}
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-5 pt-3 border-t border-border/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold font-mono-numbers text-gradient-gold">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2 text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                onClick={handleCreateOrder}
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Pedido
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs text-destructive/70 hover:text-destructive rounded-xl"
                onClick={() => { setCart([]); setCartSheetOpen(false); }}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Limpar tudo
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== FINALIZE DIALOG ===== */}
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
