import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ClipboardList, Plus, Minus, X, Loader2, Sparkles, Trash2, CreditCard, Hash, User, MapPin, Search, ShoppingBag, ShoppingCart, Eye, Pencil, MessageSquare,
  Truck, Phone, Clock, ChefHat, PackageCheck, Gift, CheckCircle2, Calendar,
} from 'lucide-react';
import { useActiveRecipes, type Recipe } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { useOpenOrders, useCreateOrder, useAddOrderItem, useRemoveOrderItem, useFinalizeOrder, useCancelOrder, useUpdateDeliveryStatus, useMarkOrderDeposit50 } from '@/hooks/useOrders';
import {
  useEncomendas,
  useCreateEncomenda,
  useUpdateEncomenda,
  encomendaStatusLabels,
  encomendaPaymentLabels,
  type Encomenda,
  type EncomendaStatus,
  type EncomendaPaymentMethod,
} from '@/hooks/useEncomendas';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery', cardapio_digital: 'Cardápio Digital', ifood: 'iFood' };
const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const categoryLabels: Record<string, string> = { bolo: 'Bolos', torta: 'Tortas', salgado: 'Salgados', bebida: 'Bebidas', doce: 'Doces', acai: 'Açaí', outro: 'Outros' };
const categoryEmoji: Record<string, string> = { bolo: '🎂', torta: '🥧', salgado: '🥟', bebida: '🥤', doce: '🍫', acai: '🫐', outro: '📦' };

// Preço padrão por fatia de bolo (quando vendido em pedaços avulsos)
const CAKE_SLICE_PRICE = 25;

/** Complementos padrão para açaí (montar). O cardápio pode sobrescrever por receita. */
const DEFAULT_ACAI_COMPLEMENTS = ['Morango', 'Banana', 'Leite condensado', 'Leite ninho', 'Granola'];

const deliverySteps = [
  { key: 'recebido', label: 'Recebido', icon: ClipboardList },
  { key: 'preparando', label: 'Preparando', icon: ChefHat },
  { key: 'saiu_entrega', label: 'Saiu p/ Entrega', icon: Truck },
  { key: 'entregue', label: 'Entregue', icon: PackageCheck },
];

function DeliveryCountdown({ startedAt, estimatedMinutes }: { startedAt: string; estimatedMinutes: number }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const calc = () => {
      const start = new Date(startedAt).getTime();
      const end = start + estimatedMinutes * 60 * 1000;
      const diff = end - Date.now();
      if (diff <= 0) { setRemaining('Chegando!'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [startedAt, estimatedMinutes]);
  return <span className="font-mono-numbers font-bold text-orange-600">{remaining}</span>;
}

function DeliveryTracker({ order, dStatus, onUpdateStatus }: {
  order: any;
  dStatus: string | null;
  onUpdateStatus: (status: string, extras?: Record<string, any>) => void;
}) {
  const [estMinutes, setEstMinutes] = useState<number>(order.estimated_delivery_minutes || 30);
  const currentIdx = deliverySteps.findIndex(s => s.key === dStatus);

  return (
    <div className="rounded-xl border border-border/20 bg-muted/10 p-3 space-y-3">
      {/* Progress steps */}
      <div className="flex items-center justify-between gap-1">
        {deliverySteps.map((step, idx) => {
          const done = idx <= currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                done
                  ? 'bg-orange-500 text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground'
              }`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={`text-[9px] text-center leading-tight ${done ? 'text-orange-600 font-semibold' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Connector line */}
      <div className="flex items-center gap-0 px-3">
        {deliverySteps.map((_, idx) => {
          if (idx === deliverySteps.length - 1) return null;
          const done = idx < currentIdx;
          return (
            <div key={idx} className={`flex-1 h-0.5 rounded-full ${done ? 'bg-orange-500' : 'bg-border/40'}`} />
          );
        })}
      </div>

      {/* Estimated time + countdown */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Tempo:</span>
          <Input
            type="number"
            min={5}
            max={180}
            value={estMinutes}
            onChange={e => setEstMinutes(Math.max(5, parseInt(e.target.value) || 30))}
            className="h-6 w-14 text-center text-xs rounded-lg border-border/30 px-1"
          />
          <span>min</span>
        </div>
        {dStatus === 'saiu_entrega' && order.delivery_started_at && order.estimated_delivery_minutes && (
          <div className="flex items-center gap-1 text-xs ml-auto">
            <Clock className="h-3 w-3 text-orange-500" />
            <span className="text-muted-foreground">Restam:</span>
            <DeliveryCountdown startedAt={order.delivery_started_at} estimatedMinutes={order.estimated_delivery_minutes} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        {dStatus === 'recebido' && (
          <Button
            size="sm"
            className="flex-1 text-[11px] h-8 rounded-lg gap-1 bg-orange-500 hover:bg-orange-600 text-primary-foreground"
            onClick={() => onUpdateStatus('preparando', { estimated_delivery_minutes: estMinutes })}
          >
            <ChefHat className="h-3 w-3" /> Preparando
          </Button>
        )}
        {dStatus === 'preparando' && (
          <Button
            size="sm"
            className="flex-1 text-[11px] h-8 rounded-lg gap-1 bg-orange-500 hover:bg-orange-600 text-primary-foreground"
            onClick={() => onUpdateStatus('saiu_entrega', {
              estimated_delivery_minutes: estMinutes,
              delivery_started_at: new Date().toISOString(),
            })}
          >
            <Truck className="h-3 w-3" /> Saiu p/ Entrega
          </Button>
        )}
        {dStatus === 'saiu_entrega' && (
          <Button
            size="sm"
            className="flex-1 text-[11px] h-8 rounded-lg gap-1 bg-green-600 hover:bg-green-700 text-primary-foreground"
            onClick={() => onUpdateStatus('entregue')}
          >
            <PackageCheck className="h-3 w-3" /> Entregue
          </Button>
        )}
      </div>
    </div>
  );
}

interface NewOrderItem {
  recipe_id: string;
  recipe_name: string;
  quantity: number;
  unit_price: number;
  photo_url?: string | null;
  category: string;
  notes?: string;
  unit_type?: 'slice' | 'whole';
  /** Complementos escolhidos (ex: açaí) — exibido e salvo nas observações */
  complementos?: string[];
}

const Orders = () => {
  const { user } = useAuth();
  const { data: recipes, isLoading: recipesLoading } = useActiveRecipes();
  const { data: openOrders, isLoading: ordersLoading } = useOpenOrders();
  const createOrder = useCreateOrder();
  const addOrderItem = useAddOrderItem();
  const removeOrderItem = useRemoveOrderItem();
  const finalizeOrder = useFinalizeOrder();
  const cancelOrder = useCancelOrder();
  const updateDelivery = useUpdateDeliveryStatus();
  const markDeposit50 = useMarkOrderDeposit50();

  const [cart, setCart] = useState<NewOrderItem[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState('balcao');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todos');

  const [activeTab, setActiveTab] = useState('cardapio');
  const [finalizeTarget, setFinalizeTarget] = useState<any>(null);
  const [payment, setPayment] = useState('dinheiro');
   // Guarda os IDs de pedidos que o usuário já cancelou nesta sessão,
  // para garantir que sumam da lista imediatamente, mesmo que o backend demore.
  const [cancelledOrderIds, setCancelledOrderIds] = useState<string[]>([]);
  const [encomendaFilter, setEncomendaFilter] = useState<EncomendaStatus | 'todos'>('pendente');

  const { data: encomendasList, isLoading: encomendasLoading, isError: encomendasError } = useEncomendas(encomendaFilter, { enabled: activeTab === 'encomendas' });
  const createEncomenda = useCreateEncomenda();
  const updateEncomenda = useUpdateEncomenda();
  const [encomendaDialogOpen, setEncomendaDialogOpen] = useState(false);
  const [editingEncomenda, setEditingEncomenda] = useState<Encomenda | null>(null);
  const [encomendaForm, setEncomendaForm] = useState({
    customer_name: '',
    customer_phone: '',
    product_description: '',
    quantity: 1,
    total_value: 0,
    address: '',
    payment_method: 'pix' as EncomendaPaymentMethod,
    paid_50_percent: false,
    observations: '',
    delivery_date: '',
    delivery_time_slot: '',
  });

  // Product dialog state
  const [selectedProduct, setSelectedProduct] = useState<Recipe | null>(null);
  const [dialogQty, setDialogQty] = useState(1);
  const [dialogNotes, setDialogNotes] = useState('');
  const [dialogUnitType, setDialogUnitType] = useState<'slice' | 'whole'>('slice');
  const [dialogComplementos, setDialogComplementos] = useState<string[]>([]);

  // Cart sheet state
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const allRecipes = recipes ?? [];

  // Categorias fixas para os filtros do cardápio (sem a aba \"Outros\")
  const categories = useMemo(() => {
    const base = ['bolo', 'doce', 'salgado', 'bebida', 'torta', 'acai'];
    // Se quiser, podemos ocultar categorias sem produto, mas aqui mantemos todas para o dono já enxergar Açaí.
    return ['todos', ...base];
  }, []);

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
    const r = recipe as any;
    setSelectedProduct(recipe);
    setDialogQty(existing?.quantity ?? 1);
    const rawNotes = existing?.notes ?? '';
    setDialogNotes(existing?.complementos?.length ? rawNotes.replace(/\n?Complementos:.*$/i, '').trim() : rawNotes);
    setDialogUnitType(existing?.unit_type || (r.sells_slice ? 'slice' : 'whole'));
    setDialogComplementos(existing?.complementos ?? []);
  };

  // Confirm add/update from dialog
  const confirmProduct = () => {
    if (!selectedProduct) return;
    const r = selectedProduct as any;
    const isCakeSlice = (selectedProduct.category === 'bolo' && dialogUnitType === 'slice');
    const price = isCakeSlice
      ? CAKE_SLICE_PRICE
      : dialogUnitType === 'whole'
        ? Number(r.whole_price || selectedProduct.sale_price)
        : Number(r.slice_price || selectedProduct.sale_price);
    const complementosText = dialogComplementos.length
      ? `Complementos: ${dialogComplementos.join(', ')}`
      : '';
    const notes = [dialogNotes.trim(), complementosText].filter(Boolean).join('\n');
    const complementos = dialogComplementos.length ? [...dialogComplementos] : undefined;
    const existing = cart.find(c => c.recipe_id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(c => c.recipe_id === selectedProduct.id
        ? { ...c, quantity: dialogQty, notes, unit_price: price, unit_type: dialogUnitType, complementos }
        : c));
    } else {
      setCart([...cart, {
        recipe_id: selectedProduct.id,
        recipe_name: selectedProduct.name,
        quantity: dialogQty,
        unit_price: price,
        photo_url: selectedProduct.photo_url,
        category: selectedProduct.category,
        notes,
        unit_type: dialogUnitType,
        complementos,
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

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setOrderNumber(order.order_number || '');
    setTableNumber(order.table_number || '');
    setCustomerName(order.customer_name || '');
    setChannel(order.channel || 'balcao');
    setCart([]);
    setActiveTab('cardapio');
  };

  const handleAddItemsToOrder = async () => {
    if (!editingOrder || cart.length === 0) return;
    try {
      for (const c of cart) {
        await addOrderItem.mutateAsync({
          order_id: editingOrder.id,
          recipe_id: c.recipe_id,
          inventory_id: '',
          quantity: c.quantity,
          unit_price: c.unit_price,
        });
      }
      toast.success(`Itens adicionados ao pedido!`);
      setCart([]);
      setEditingOrder(null);
      setOrderNumber('');
      setTableNumber('');
      setCustomerName('');
      setCartSheetOpen(false);
      setActiveTab('pedidos');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar itens');
    }
  };

  const handleCreateOrder = async () => {
    if (editingOrder) {
      return handleAddItemsToOrder();
    }
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
          unit_type: c.unit_type || 'slice',
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
      setCancelledOrderIds(prev =>
        prev.includes(orderId) ? prev : [...prev, orderId],
      );
      toast.success('Pedido cancelado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar');
    }
  };

  const isInCart = (recipeId: string) => cart.find(c => c.recipe_id === recipeId);

  return (
    <AppLayout>
      <ErrorBoundary>
      <div className="min-w-0 max-w-full overflow-hidden space-y-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="page-title">Cardápio</h1>
            <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">
              {editingOrder
                ? `Editando Pedido #${editingOrder.order_number || (editingOrder.id ?? '').toString().slice(0, 8)}`
                : 'Monte o pedido do cliente'}
            </p>
            {!editingOrder && (
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Pedidos combinados no WhatsApp: anote aqui na plataforma.
              </p>
            )}
          </div>
          {openOrders && openOrders.filter((o: any) => !cancelledOrderIds.includes(o.id)).length > 0 && !editingOrder && (
            <Badge className="text-xs px-3 py-1.5 rounded-full font-semibold shrink-0" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
              {openOrders.filter((o: any) => !cancelledOrderIds.includes(o.id)).length} pedido{openOrders.filter((o: any) => !cancelledOrderIds.includes(o.id)).length > 1 ? 's' : ''} aberto{openOrders.filter((o: any) => !cancelledOrderIds.includes(o.id)).length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Editing banner */}
        {editingOrder && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Pencil className="h-4 w-4 text-accent" />
              <span className="font-medium text-foreground">
                Adicionando itens ao pedido
                {editingOrder.order_number ? ` #${editingOrder.order_number}` : ''}
                {editingOrder.customer_name ? ` · ${editingOrder.customer_name}` : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive/70 hover:text-destructive rounded-lg gap-1 shrink-0"
              onClick={() => { setEditingOrder(null); setCart([]); setOrderNumber(''); setTableNumber(''); setCustomerName(''); }}
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'encomendas') setEncomendaFilter('pendente'); }} className="w-full min-w-0">
          <TabsList className="w-full min-w-0 grid grid-cols-fit-3 h-12 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="cardapio" className="rounded-lg text-sm font-semibold gap-2 data-[state=active]:shadow-md">
              <ShoppingBag className="h-4 w-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="rounded-lg text-sm font-semibold gap-2 data-[state=active]:shadow-md">
              <ClipboardList className="h-4 w-4" />
              Pedidos
              {openOrders && openOrders.length > 0 && (
                <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] rounded-full ml-1" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
                  {openOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="encomendas" className="rounded-lg text-sm font-semibold gap-2 data-[state=active]:shadow-md">
              <Gift className="h-4 w-4" />
              Encomendas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cardapio" className="mt-4 space-y-4 min-w-0">
            {/* Search bar */}
            <div className="relative min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <Input
                className="h-12 pl-12 rounded-2xl text-sm border-border/30 bg-card/80 backdrop-blur-sm shadow-sm"
                placeholder="Buscar no cardápio..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category pills */}
            <div className="w-full min-w-0">
              <div className="flex gap-2 pb-2 flex-wrap">
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
            </div>

            {/* Product grid */}
            {recipesLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !filteredItems.length ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground/60 text-sm">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-fit-1 sm:grid-cols-fit-2 lg:grid-cols-fit-3 min-w-0 w-full">
                {filteredItems.map(recipe => {
                  const inCart = isInCart(recipe.id);
                  return (
                    <button
                      key={recipe.id}
                      onClick={() => openProductDialog(recipe)}
                      className="group relative min-w-0 bg-card/90 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-accent/30 hover:-translate-y-1 active:scale-[0.98]"
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
            ) : !openOrders || openOrders.filter((o: any) => !cancelledOrderIds.includes(o.id)).length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground/60 text-sm">Nenhum pedido aberto</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-fit-1 sm:grid-cols-fit-2 lg:grid-cols-fit-3 min-w-0 w-full">
                {openOrders
                  .filter((order: any) => !cancelledOrderIds.includes(order.id))
                  .map((order: any) => {
                  const orderTotal = (order.order_items || []).reduce((s: number, i: any) => s + Number(i.subtotal), 0);
                  const isDelivery = order.channel === 'delivery' || order.channel === 'cardapio_digital';
                  const dStatus = order.delivery_status as string | null;

                  return (
                    <div key={order.id} className="glass-card rounded-2xl overflow-hidden">
                      {/* Header with channel badge */}
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
                          {/* Channel badge */}
                          {isDelivery ? (
                            <Badge className="text-[10px] rounded-full border-0 bg-orange-500/15 text-orange-600 gap-1">
                              <Truck className="h-3 w-3" />
                              {channelLabels[order.channel] || order.channel}
                            </Badge>
                          ) : order.channel === 'ifood' ? (
                            <Badge className="text-[10px] rounded-full border-0 bg-red-500/15 text-red-600">
                              {channelLabels[order.channel]}
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] rounded-full border-0 bg-muted/50 text-muted-foreground">
                              {channelLabels[order.channel] || 'Balcão'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono-numbers">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Customer info */}
                        {(order.customer_name || order.customer_phone) && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {order.customer_name && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {order.customer_name}</span>
                            )}
                            {order.customer_phone && (
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.customer_phone}</span>
                            )}
                          </div>
                        )}

                        {/* Items */}
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
                                    className="h-8 w-8 md:h-6 md:w-6 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 text-destructive/60 hover:text-destructive transition-opacity"
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

                        {/* Delivery Tracker */}
                        {isDelivery && (
                          <DeliveryTracker
                            order={order}
                            dStatus={dStatus}
                            onUpdateStatus={(status, extras) => {
                              updateDelivery.mutate({
                                orderId: order.id,
                                delivery_status: status,
                                ...extras,
                              });
                            }}
                          />
                        )}

                        {/* Total + depósito 50% + actions */}
                        <div className="pt-3 border-t border-border/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Total</span>
                              {order.deposit_50_paid && (
                                <Badge className="w-fit text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/40">
                                  50% pago antecipado
                                </Badge>
                              )}
                            </div>
                            <span className="font-bold font-mono-numbers text-lg text-gradient-gold">R$ {orderTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm" variant="ghost"
                                  className="text-xs text-destructive/70 hover:text-destructive flex-1 rounded-xl"
                                  disabled={cancelOrder.isPending}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Você tem certeza que quer excluir o pedido
                                    {order.order_number ? ` #${order.order_number}` : ''}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Não</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancel(order.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Sim, excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button
                              size="sm" variant="outline"
                              className="text-xs gap-1 flex-1 rounded-xl"
                              onClick={() => handleEditOrder(order)}
                            >
                              <Pencil className="h-3 w-3" /> Editar
                            </Button>
                            {!order.deposit_50_paid && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1 flex-1 rounded-xl text-amber-700 border-amber-500/60"
                                disabled={markDeposit50.isPending}
                                onClick={() => markDeposit50.mutate(order.id)}
                              >
                                <CreditCard className="h-3 w-3" /> Marcar 50% pago
                              </Button>
                            )}
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

          <TabsContent value="encomendas" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Select value={encomendaFilter} onValueChange={(v) => setEncomendaFilter(v as EncomendaStatus | 'todos')}>
                <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(['pendente', 'confirmado', '50_pago', 'em_preparo', 'entregue', 'cancelado'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{encomendaStatusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="gap-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                onClick={() => {
                  setEditingEncomenda(null);
                  setEncomendaForm({
                    customer_name: '', customer_phone: '', product_description: '', quantity: 1, total_value: 0,
                    address: '', payment_method: 'pix', paid_50_percent: false, observations: '', delivery_date: '', delivery_time_slot: '',
                  });
                  setEncomendaDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Nova encomenda
              </Button>
            </div>
            {encomendasError ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5">
                <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">Não foi possível carregar as encomendas.</p>
                <p className="text-muted-foreground text-xs mt-1">Execute a migration da tabela &quot;encomendas&quot; no Supabase (SQL Editor).</p>
              </div>
            ) : encomendasLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !encomendasList?.length ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/50 bg-muted/20">
                <Gift className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma encomenda nesta lista</p>
                <p className="text-xs text-muted-foreground mt-1">Pedidos pelo WhatsApp: 50% adiantado (PIX/cartão), restante na entrega.</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-fit-1 sm:grid-cols-fit-2 lg:grid-cols-fit-3 min-w-0 w-full">
                {(encomendasList || []).map((enc: Encomenda) => (
                  <div key={enc.id} className="rounded-xl border border-border/30 bg-card overflow-hidden">
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{enc.customer_name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{encomendaStatusLabels[enc.status as EncomendaStatus]}</Badge>
                      </div>
                      {enc.customer_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {enc.customer_phone}</p>
                      )}
                      <p className="text-sm text-foreground/90">{enc.product_description}</p>
                      <p className="text-xs text-muted-foreground">Qtde: {Number(enc.quantity)} · R$ {Number(enc.total_value).toFixed(2)}</p>
                      {enc.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={enc.address}><MapPin className="h-3 w-3 shrink-0" /> {enc.address}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{encomendaPaymentLabels[enc.payment_method as EncomendaPaymentMethod] ?? enc.payment_method}</span>
                        {enc.paid_50_percent ? (
                          <Badge className="text-[10px] bg-emerald-500/20 text-emerald-600 border-0">50% pago</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/50">Aguard. 50%</Badge>
                        )}
                      </div>
                      {(enc.delivery_date || enc.delivery_time_slot) && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {enc.delivery_date ? new Date(enc.delivery_date + 'Z').toLocaleDateString('pt-BR') : ''}
                          {enc.delivery_time_slot ? ` · ${enc.delivery_time_slot}` : ''}
                        </p>
                      )}
                      {enc.observations && (
                        <p className="text-[10px] text-muted-foreground italic truncate" title={enc.observations}>{enc.observations}</p>
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-border/20 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => {
                          setEditingEncomenda(enc);
                          setEncomendaForm({
                            customer_name: enc.customer_name,
                            customer_phone: enc.customer_phone || '',
                            product_description: enc.product_description,
                            quantity: Number(enc.quantity),
                            total_value: Number(enc.total_value),
                            address: enc.address || '',
                            payment_method: enc.payment_method as EncomendaPaymentMethod,
                            paid_50_percent: enc.paid_50_percent,
                            observations: enc.observations || '',
                            delivery_date: enc.delivery_date || '',
                            delivery_time_slot: enc.delivery_time_slot || '',
                          });
                          setEncomendaDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      {!enc.paid_50_percent && enc.status !== 'cancelado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-emerald-600 border-emerald-500/50"
                          onClick={() => updateEncomenda.mutate({ id: enc.id, paid_50_percent: true, status: '50_pago' })}
                          disabled={updateEncomenda.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar 50% pago
                        </Button>
                      )}
                      {enc.status !== 'entregue' && enc.status !== 'cancelado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => updateEncomenda.mutate({ id: enc.id, status: 'entregue' })}
                          disabled={updateEncomenda.isPending}
                        >
                          <PackageCheck className="h-3 w-3 mr-1" /> Entregue
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== FLOATING CART BAR (portal to escape transform context) ===== */}
      {cart.length > 0 && !cartSheetOpen && createPortal(
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-2xl md:ml-[calc(var(--sidebar-width,280px)/2)]">
          <button
            onClick={() => setCartSheetOpen(true)}
            className="w-full rounded-2xl border border-border/30 backdrop-blur-xl shadow-2xl px-4 py-3 md:px-5 md:py-3.5 flex items-center justify-between gap-4 transition-all hover:shadow-3xl active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.95))' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-primary-foreground relative shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
                <p className="font-bold font-mono-numbers text-sm md:text-base text-foreground">R$ {cartTotal.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editingOrder && (
                <Badge variant="outline" className="text-[10px] border-accent/40 text-accent font-semibold rounded-full">
                  Editando #{editingOrder?.order_number || (editingOrder?.id?.slice(0, 4) ?? '...')}
                </Badge>
              )}
              <span
                className="inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold px-4 py-2 text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
              >
                <Eye className="h-3.5 w-3.5" />
                {editingOrder ? 'Ver Itens' : 'Ver Carrinho'}
              </span>
            </div>
          </button>
        </div>,
        document.body
      )}

      {/* ===== PRODUCT DIALOG ===== */}
      <Dialog open={!!selectedProduct} onOpenChange={open => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          {selectedProduct && (() => {
            const inCart = isInCart(selectedProduct.id);
            const r = selectedProduct as any;
            const isCakeSlice = (selectedProduct.category === 'bolo' && dialogUnitType === 'slice');
            const currentPrice = isCakeSlice
              ? CAKE_SLICE_PRICE
              : dialogUnitType === 'whole'
                ? Number(r.whole_price || selectedProduct.sale_price)
                : Number(r.slice_price || selectedProduct.sale_price);
            const subtotal = dialogQty * currentPrice;
            const showSelector = r.sells_whole && r.sells_slice;
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
                  {/* Description */}
                  {r.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {r.description}
                    </p>
                  )}

                  {/* Slice/Whole selector or Price */}
                  {showSelector ? (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modo de Venda</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDialogUnitType('slice')}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                            dialogUnitType === 'slice'
                              ? 'bg-accent text-accent-foreground shadow-md'
                              : 'bg-secondary/50 text-muted-foreground border border-border/60 hover:bg-secondary/80'
                          }`}
                        >
                          🍰 Fatia
                          <span className="block text-xs font-mono mt-0.5">
                            R$ {(selectedProduct.category === 'bolo'
                              ? CAKE_SLICE_PRICE
                              : Number(r.slice_price || 0)
                            ).toFixed(2)}
                          </span>
                        </button>
                        <button
                          onClick={() => setDialogUnitType('whole')}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                            dialogUnitType === 'whole'
                              ? 'bg-accent text-accent-foreground shadow-md'
                              : 'bg-secondary/50 text-muted-foreground border border-border/60 hover:bg-secondary/80'
                          }`}
                        >
                          🎂 Inteiro
                          <span className="block text-xs font-mono mt-0.5">R$ {Number(r.whole_price || 0).toFixed(2)}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-2xl font-bold font-mono-numbers text-gradient-gold">
                        R$ {currentPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/ {r.sells_whole ? 'inteiro' : 'unidade'}</span>
                    </div>
                  )}

                  {/* Complementos (açaí / montar) */}
                  {((selectedProduct.category as string) === 'acai' || (r.complementos && Array.isArray(r.complementos) && r.complementos.length > 0)) && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Complementos</Label>
                      <div className="flex flex-wrap gap-2">
                        {((r.complementos && r.complementos.length) ? r.complementos : DEFAULT_ACAI_COMPLEMENTS).map((comp: string) => {
                          const checked = dialogComplementos.includes(comp);
                          return (
                            <label
                              key={comp}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                                checked ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setDialogComplementos(prev => v ? [...prev, comp] : prev.filter(c => c !== comp));
                                }}
                              />
                              <span>{comp}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
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
                    <div className="flex items-center gap-3">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.recipe_name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                          <span className="text-lg">{categoryEmoji[item.category ?? 'outro'] ?? '📦'}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground leading-tight">
                          {item.recipe_name}
                          {item.unit_type && (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                              ({item.unit_type === 'whole' ? 'Inteiro' : 'Fatia'})
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground font-mono-numbers">
                            {item.quantity}× R$ {item.unit_price.toFixed(2)}
                          </p>
                          <span className="font-bold font-mono-numbers text-sm text-foreground">
                            R$ {(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </div>
                      </div>
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
                        className="text-xs h-9 min-h-[44px] rounded-lg gap-1.5 flex-1"
                        onClick={() => editCartItem(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-9 min-h-[44px] rounded-lg gap-1.5 flex-1 text-destructive/70 hover:text-destructive"
                        onClick={() => removeFromCart(item.recipe_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ===== DADOS DO PEDIDO (metadata section) ===== */}
            {cart.length > 0 && !editingOrder && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/20" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Dados do Pedido</span>
                  <div className="h-px flex-1 bg-border/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Comanda</Label>
                    <Input className="h-9 text-sm rounded-xl border-border/30 bg-background/50" placeholder="Nº" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} maxLength={20} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Mesa</Label>
                    <Input className="h-9 text-sm rounded-xl border-border/30 bg-background/50" placeholder="Nº" value={tableNumber} onChange={e => setTableNumber(e.target.value)} maxLength={10} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Cliente</Label>
                    <Input className="h-9 text-sm rounded-xl border-border/30 bg-background/50" placeholder="Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Canal</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger className="h-9 rounded-xl border-border/30 bg-background/50 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.sales_channel.filter(c => c !== 'ifood').map(c => (
                          <SelectItem key={c} value={c}>{channelLabels[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-5 pt-3 pb-28 md:pb-5 border-t border-border/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold font-mono-numbers text-gradient-gold">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2 text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                onClick={handleCreateOrder}
                disabled={createOrder.isPending || addOrderItem.isPending}
              >
                {(createOrder.isPending || addOrderItem.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingOrder ? `Adicionar ao Pedido #${editingOrder?.order_number || (editingOrder?.id?.slice(0, 4) ?? '...')}` : 'Criar Pedido'}
              </Button>
              {editingOrder ? (
                <Button
                  variant="ghost"
                  className="w-full text-xs text-destructive/70 hover:text-destructive rounded-xl"
                  onClick={() => { setEditingOrder(null); setCart([]); setOrderNumber(''); setTableNumber(''); setCustomerName(''); setCartSheetOpen(false); }}
                >
                  <X className="h-3 w-3 mr-1" /> Cancelar edição
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full text-xs text-destructive/70 hover:text-destructive rounded-xl"
                  onClick={() => { setCart([]); setCartSheetOpen(false); }}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Limpar tudo
                </Button>
              )}
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

      {/* ===== ENCOMENDA DIALOG (nova / editar) ===== */}
      <Dialog open={encomendaDialogOpen} onOpenChange={setEncomendaDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEncomenda ? 'Editar encomenda' : 'Nova encomenda'}</DialogTitle>
            <DialogDescription>Dados da pessoa, produto, valor e entrega. 50% adiantado (PIX/cartão), restante na entrega.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={encomendaForm.customer_name}
                  onChange={e => setEncomendaForm(f => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={encomendaForm.customer_phone}
                  onChange={e => setEncomendaForm(f => ({ ...f, customer_phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Produto / descrição *</Label>
              <Input
                value={encomendaForm.product_description}
                onChange={e => setEncomendaForm(f => ({ ...f, product_description: e.target.value }))}
                placeholder="Ex: Bolo de chocolate 2kg, 50 docinhos..."
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={encomendaForm.quantity || ''}
                  onChange={e => setEncomendaForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 1 }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor total (R$) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={encomendaForm.total_value || ''}
                  onChange={e => setEncomendaForm(f => ({ ...f, total_value: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço de entrega</Label>
              <Input
                value={encomendaForm.address}
                onChange={e => setEncomendaForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Rua, número, bairro, cidade"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={encomendaForm.payment_method}
                onValueChange={v => setEncomendaForm(f => ({ ...f, payment_method: v as EncomendaPaymentMethod }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credito">Cartão crédito</SelectItem>
                  <SelectItem value="debito">Cartão débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="paid50"
                checked={encomendaForm.paid_50_percent}
                onChange={e => setEncomendaForm(f => ({ ...f, paid_50_percent: e.target.checked }))}
                className="rounded border-border"
              />
              <Label htmlFor="paid50" className="cursor-pointer text-sm">50% já foi pago (adiantado)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data da entrega</Label>
                <Input
                  type="date"
                  value={encomendaForm.delivery_date}
                  onChange={e => setEncomendaForm(f => ({ ...f, delivery_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Horário (ex: 14h às 18h)</Label>
                <Input
                  value={encomendaForm.delivery_time_slot}
                  onChange={e => setEncomendaForm(f => ({ ...f, delivery_time_slot: e.target.value }))}
                  placeholder="14h às 18h"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações do cliente</Label>
              <Textarea
                value={encomendaForm.observations}
                onChange={e => setEncomendaForm(f => ({ ...f, observations: e.target.value }))}
                placeholder="Alguma observação sobre o pedido, horário que pode receber..."
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEncomendaDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!encomendaForm.customer_name.trim() || !encomendaForm.product_description.trim() || createEncomenda.isPending || updateEncomenda.isPending}
              onClick={async () => {
                if (editingEncomenda) {
                  await updateEncomenda.mutateAsync({
                    id: editingEncomenda.id,
                    customer_name: encomendaForm.customer_name.trim(),
                    customer_phone: encomendaForm.customer_phone.trim() || null,
                    product_description: encomendaForm.product_description.trim(),
                    quantity: encomendaForm.quantity,
                    total_value: encomendaForm.total_value,
                    address: encomendaForm.address.trim() || null,
                    payment_method: encomendaForm.payment_method,
                    paid_50_percent: encomendaForm.paid_50_percent,
                    observations: encomendaForm.observations.trim() || null,
                    delivery_date: encomendaForm.delivery_date || null,
                    delivery_time_slot: encomendaForm.delivery_time_slot.trim() || null,
                  });
                  toast.success('Encomenda atualizada');
                } else {
                  await createEncomenda.mutateAsync({
                    customer_name: encomendaForm.customer_name.trim(),
                    customer_phone: encomendaForm.customer_phone.trim() || null,
                    product_description: encomendaForm.product_description.trim(),
                    quantity: encomendaForm.quantity,
                    total_value: encomendaForm.total_value,
                    address: encomendaForm.address.trim() || null,
                    payment_method: encomendaForm.payment_method,
                    paid_50_percent: encomendaForm.paid_50_percent,
                    observations: encomendaForm.observations.trim() || null,
                    delivery_date: encomendaForm.delivery_date || null,
                    delivery_time_slot: encomendaForm.delivery_time_slot.trim() || null,
                  });
                  toast.success('Encomenda cadastrada');
                }
                setEncomendaDialogOpen(false);
                setEditingEncomenda(null);
              }}
              className="gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
            >
              {(createEncomenda.isPending || updateEncomenda.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingEncomenda ? 'Salvar' : 'Cadastrar encomenda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Orders;
