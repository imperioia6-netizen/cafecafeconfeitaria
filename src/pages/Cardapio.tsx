import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Minus, Loader2, ShoppingCart, CheckCircle2, X, UserCircle, MapPin, Store, MessageSquare, Package, ClipboardList, Truck, Hash, Eye, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import bannerImg from '@/assets/banner-cardapio.png';

const categoryFilters = [
  { key: 'todas', label: 'Todas', emoji: '🍽️' },
  { key: 'bolo', label: 'Bolos', emoji: '🎂' },
  { key: 'torta', label: 'Tortas', emoji: '🥧' },
  { key: 'salgado', label: 'Salgados', emoji: '🥪' },
  { key: 'bebida', label: 'Bebidas', emoji: '🥤' },
  { key: 'doce', label: 'Doces', emoji: '🍬' },
  { key: 'outro', label: 'Outros', emoji: '🍴' },
];

const categoryLabels: Record<string, string> = {
  bolo: 'Bolo', torta: 'Torta', salgado: 'Salgado', bebida: 'Bebida', doce: 'Doce', outro: 'Outro',
};

type CartItem = { recipe_id: string; name: string; price: number; quantity: number; photo_url?: string | null; notes?: string };

type SelectedProduct = {
  id: string;
  name: string;
  sale_price: number;
  photo_url?: string | null;
  category: string;
};

const Cardapio = () => {
  const { data: recipes, isLoading } = useActiveRecipes();
  const { user, viewAs, setViewAs, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<{ order_number: string; total: number } | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  // Product detail dialog state
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [dialogQty, setDialogQty] = useState(1);
  const [dialogNotes, setDialogNotes] = useState('');

  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const isSimulating = !!user && viewAs === 'client';

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name, photo_url').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.name);
          setProfilePhoto(data.photo_url);
        }
      });
  }, [user]);

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  const exitSimulation = () => {
    setViewAs(null);
    navigate('/');
  };

  const filtered = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter(r => {
      const matchesCategory = category === 'todas' || r.category === category;
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [recipes, search, category]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const getCartQty = (recipeId: string) => cart.find(c => c.recipe_id === recipeId)?.quantity || 0;

  // Quick add (+1, no dialog)
  const quickAddToCart = (recipe: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.recipe_id === recipe.id);
      if (existing) {
        return prev.map(c => c.recipe_id === recipe.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { recipe_id: recipe.id, name: recipe.name, price: Number(recipe.sale_price), quantity: 1, photo_url: recipe.photo_url }];
    });
  };

  // Add/update from dialog (with qty + notes)
  const addFromDialog = () => {
    if (!selectedProduct) return;
    const p = selectedProduct;
    setCart(prev => {
      const filtered = prev.filter(c => c.recipe_id !== p.id);
      return [...filtered, {
        recipe_id: p.id,
        name: p.name,
        price: Number(p.sale_price),
        quantity: dialogQty,
        photo_url: p.photo_url,
        notes: dialogNotes.trim() || undefined,
      }];
    });
    setSelectedProduct(null);
  };

  const removeFromCart = (recipeId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.recipe_id === recipeId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.recipe_id !== recipeId);
      return prev.map(c => c.recipe_id === recipeId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  // Open product dialog
  const openProductDialog = (recipe: any) => {
    const existing = cart.find(c => c.recipe_id === recipe.id);
    setSelectedProduct({
      id: recipe.id,
      name: recipe.name,
      sale_price: Number(recipe.sale_price),
      photo_url: recipe.photo_url,
      category: recipe.category,
    });
    setDialogQty(existing?.quantity || 1);
    setDialogNotes(existing?.notes || '');
  };

  const handleSubmitOrder = async () => {
    if (!customerName.trim() || cart.length === 0) return;
    if (deliveryMode === 'pickup' && !orderNumber.trim()) return;
    if (deliveryMode === 'delivery' && (!customerPhone.trim() || !address.trim() || !addressNumber.trim())) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-order', {
        body: {
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          order_number: deliveryMode === 'pickup' ? orderNumber.trim() : null,
          items: cart.map(c => ({ recipe_id: c.recipe_id, quantity: c.quantity, notes: c.notes || null })),
          delivery_mode: deliveryMode,
          address: deliveryMode === 'delivery' ? address.trim() : null,
          address_number: deliveryMode === 'delivery' ? addressNumber.trim() : null,
          address_complement: deliveryMode === 'delivery' ? addressComplement.trim() || null : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuccess({ order_number: data.order_number, total: data.total });
      setCheckoutOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar pedido');
    } finally {
      setSending(false);
    }
  };

  const handleNewOrder = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setOrderNumber('');
    setDeliveryMode('pickup');
    setAddress('');
    setAddressNumber('');
    setAddressComplement('');
    setSuccess(null);
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-background hero-gradient flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Pedido enviado!
          </h1>
          <p className="text-muted-foreground">
            Seu pedido <span className="font-semibold text-foreground">{success.order_number}</span> foi recebido com sucesso.
          </p>
          <p className="text-xl font-bold text-foreground font-mono-numbers">
            Total: R$ {success.total.toFixed(2).replace('.', ',')}
          </p>
           <p className="text-sm text-muted-foreground">
             {deliveryMode === 'delivery'
               ? 'Seu pedido será entregue no endereço informado.'
               : 'Aguarde o preparo. Você será chamado quando estiver pronto.'}
           </p>
          <button
            onClick={handleNewOrder}
            className="w-full py-3 rounded-full bg-accent text-accent-foreground font-semibold hover:brightness-110 transition-all shadow-md"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>
    );
  }

  const dialogSubtotal = selectedProduct ? dialogQty * selectedProduct.sale_price : 0;

  return (
    <div className={`min-h-screen bg-background hero-gradient text-foreground pb-20 cardapio-page overflow-y-auto ${isSimulating ? 'pt-[105px]' : 'pt-[73px]'}`}>
      {/* Simulation top bar */}
      {isSimulating && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-warning z-40 flex items-center justify-center">
          <span className="text-warning-foreground text-xs font-semibold">Visão: Cliente</span>
          <button onClick={exitSimulation} className="absolute right-3 text-warning-foreground hover:opacity-70 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Banner logo */}
      <div className="bg-black py-6 md:py-8">
        <img
          src={bannerImg}
          alt="Cafe e Cafe Confeitaria"
          className="mx-auto max-w-[280px] md:max-w-[400px] w-full h-auto"
        />
        <div className="mt-4 h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)' }} />
      </div>

      {/* Delivery mode toggle */}
      <div className="bg-card/60 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            <button
              onClick={() => setDeliveryMode('pickup')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${
                deliveryMode === 'pickup'
                  ? 'bg-accent text-accent-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground border border-border/60 hover:bg-secondary/80'
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Store className="h-4 w-4" />
              No Local
            </button>
            <button
              onClick={() => setDeliveryMode('delivery')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${
                deliveryMode === 'delivery'
                  ? 'bg-accent text-accent-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground border border-border/60 hover:bg-secondary/80'
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <MapPin className="h-4 w-4" />
              Delivery
            </button>
          </div>
        </div>
      </div>

      {/* Header - dark cinematic */}
      <header className={`fixed ${isSimulating ? 'top-8' : 'top-0'} left-0 right-0 z-50 border-b border-sidebar-border shadow-lg`} style={{ background: 'linear-gradient(135deg, hsl(24 35% 15%), hsl(24 30% 10%))' }}>
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center gap-2 md:gap-4">
            <h1 className="text-lg md:text-2xl font-bold text-gradient-gold whitespace-nowrap flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
             🍰 <span className="hidden sm:inline">Cardápio</span>
           </h1>
          <div className="flex-1 max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-full bg-sidebar-accent/60 backdrop-blur-sm border border-sidebar-border text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
          </div>
          {/* Cart icon in header */}
          <button
            onClick={() => cartCount > 0 && setCheckoutOpen(true)}
            className="relative p-2 rounded-full hover:bg-sidebar-accent/50 transition-colors"
          >
            <ShoppingCart className="h-5 w-5 text-sidebar-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          {/* Avatar */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer outline-none">
                  <Avatar className="h-9 w-9 border-2 border-accent/40">
                    {profilePhoto && <AvatarImage src={profilePhoto} alt={profileName || ''} />}
                    <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
                      {profileName ? getInitials(profileName) : <UserCircle className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover border-border shadow-xl z-50">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
                  <UserCircle className="h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>

                {roles.includes('owner') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                        <Eye className="h-4 w-4" />
                        Trocar Visão
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-popover border-border shadow-xl z-50">
                        {([
                          { role: 'owner' as const, label: 'Proprietário' },
                          { role: 'employee' as const, label: 'Funcionário' },
                          { role: 'client' as const, label: 'Cliente' },
                        ]).map(({ role, label }) => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => {
                              if (role === 'owner') { setViewAs(null); navigate('/'); }
                              else if (role === 'employee') { setViewAs('employee'); navigate('/'); }
                              else { setViewAs('client'); }
                            }}
                            className={`cursor-pointer ${(!viewAs && role === 'owner') || viewAs === role ? 'bg-accent/20 font-semibold' : ''}`}
                          >
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button onClick={() => navigate('/auth')} className="p-1.5 rounded-full hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
              <UserCircle className="h-6 w-6 text-sidebar-foreground/60" />
            </button>
          )}
        </div>
      </header>

      {/* Categories section */}
      <section className={`sticky ${isSimulating ? 'top-[105px]' : 'top-[73px]'} z-40 bg-background/90 backdrop-blur-xl border-b border-border/50`}>
        <div className="max-w-7xl mx-auto px-4 py-2 md:py-4">
          <h2 className="hidden md:block text-lg font-semibold mb-3 tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Nossos Produtos
          </h2>
          <div className="hidden md:block separator-gradient mb-4 opacity-60" />
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {categoryFilters.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium tracking-wide whitespace-nowrap transition-all ${
                  category === c.key
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-card text-secondary-foreground border border-border/60 hover:bg-card/80'
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filtered.map(recipe => {
              const qty = getCartQty(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="bg-card border border-border/60 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                  onClick={() => openProductDialog(recipe)}
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden rounded-t-2xl">
                    {recipe.photo_url ? (
                      <img
                        src={recipe.photo_url}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl bg-secondary/50">
                        {recipe.category === 'bolo' ? '🎂' : recipe.category === 'torta' ? '🥧' : recipe.category === 'salgado' ? '🥪' : recipe.category === 'bebida' ? '🥤' : recipe.category === 'doce' ? '🍬' : '🍴'}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-[15px] font-medium text-foreground line-clamp-2 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {recipe.name}
                    </h3>
                    {(recipe as any).sell_mode === 'inteiro' && (recipe as any).weight_kg && (
                      <p className="text-[11px] text-muted-foreground font-medium">{Number((recipe as any).weight_kg)} Kg</p>
                    )}
                    <div className="flex items-end justify-between">
                      <p className="text-base font-semibold tracking-wide text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        R$ {Number(recipe.sale_price).toFixed(2).replace('.', ',')}
                      </p>
                      {qty === 0 ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); quickAddToCart(recipe); }}
                          className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground hover:brightness-110 transition-all shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => removeFromCart(recipe.id)}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>{qty}</span>
                          <button
                            onClick={() => quickAddToCart(recipe)}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground hover:brightness-110 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border/60 bg-card gap-0">
          <DialogTitle className="sr-only">{selectedProduct?.name || 'Detalhes do produto'}</DialogTitle>
          {selectedProduct && (
            <>
              {/* Product image */}
              <div className="aspect-[16/9] bg-muted overflow-hidden">
                {selectedProduct.photo_url ? (
                  <img
                    src={selectedProduct.photo_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl bg-secondary/50">
                    {selectedProduct.category === 'bolo' ? '🎂' : selectedProduct.category === 'torta' ? '🥧' : selectedProduct.category === 'salgado' ? '🥪' : selectedProduct.category === 'bebida' ? '🥤' : selectedProduct.category === 'doce' ? '🍬' : '🍴'}
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {categoryLabels[selectedProduct.category] || selectedProduct.category}
                  </p>
                  <p className="text-lg font-bold mt-2" style={{ color: '#8B6914', fontFamily: "'DM Sans', sans-serif" }}>
                    R$ {selectedProduct.sale_price.toFixed(2).replace('.', ',')}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/unidade</span>
                  </p>
                </div>

                {/* Quantity controls */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Quantidade
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDialogQty(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors"
                    >
                      <Minus className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="text-xl font-bold w-10 text-center text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {dialogQty}
                    </span>
                    <button
                      onClick={() => setDialogQty(q => q + 1)}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Observações
                  </label>
                  <Textarea
                    value={dialogNotes}
                    onChange={e => setDialogNotes(e.target.value)}
                    placeholder="Ex: sem açúcar, fatia grande, metade morango..."
                    className="resize-none bg-secondary/30 border-border/60 rounded-xl text-sm min-h-[70px]"
                  />
                </div>

                {/* Add button */}
                <button
                  onClick={addFromDialog}
                  className="w-full py-3.5 rounded-full font-semibold text-white hover:brightness-110 transition-all shadow-md text-sm"
                  style={{ background: 'linear-gradient(135deg, #8B6914, #A67C00)' }}
                >
                  + Adicionar — R$ {dialogSubtotal.toFixed(2).replace('.', ',')}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-sidebar-border shadow-[0_-4px_20px_rgba(0,0,0,0.2)]" style={{ background: 'hsl(24 35% 15% / 0.95)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-accent" />
                <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-lg font-bold text-sidebar-foreground font-mono-numbers">
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="px-6 py-2.5 rounded-full bg-accent text-accent-foreground font-semibold hover:brightness-110 transition-all shadow-md glow-accent"
            >
              {deliveryMode === 'delivery' ? 'Pedir Delivery' : 'Fazer Pedido'}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Sheet sidebar */}
      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-md p-0 border-l border-border/40 flex flex-col bg-card"
        >
          {/* ── Header ── */}
          <SheetHeader className="px-5 pt-6 pb-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(36 70% 50% / 0.15), hsl(36 70% 50% / 0.25))' }}>
                <ShoppingCart className="h-5 w-5 text-accent" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Meu Carrinho
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                </p>
              </div>
            </div>
          </SheetHeader>
          <div className="mx-5 mt-4 separator-gradient" />

          {/* ── Scrollable content ── */}
          <ScrollArea className="flex-1">
            <div className="px-5 py-5 space-y-6">

              {/* ── Section: Cart Items ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-accent" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Itens do Carrinho
                  </span>
                </div>
                <div className="space-y-2.5">
                  {cart.map(item => (
                    <div key={item.recipe_id} className="relative flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3.5 shadow-sm">
                      {/* Remove button - top right */}
                      <button
                        onClick={() => setCart(prev => prev.filter(c => c.recipe_id !== item.recipe_id))}
                        className="absolute top-2 right-2 p-0.5 rounded-full hover:bg-secondary/60 transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>

                      {/* Product image */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary/50 flex-shrink-0">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl bg-secondary/30">🍰</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-foreground truncate leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                            <MessageSquare className="h-3 w-3 flex-shrink-0" />
                            {item.notes}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-accent mt-1 font-mono-numbers">
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => removeFromCart(item.recipe_id)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors"
                        >
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <span className="text-sm font-bold w-6 text-center text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => quickAddToCart({ id: item.recipe_id, name: item.name, sale_price: item.price, photo_url: item.photo_url })}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors"
                        >
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section: Delivery Address (delivery mode only) ── */}
              {deliveryMode === 'delivery' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-accent" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Endereço de Entrega
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-xs font-medium text-muted-foreground">Endereço *</Label>
                      <Input
                        id="address"
                        placeholder="Rua, Avenida..."
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/40 focus:ring-accent/10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="addressNumber" className="text-xs font-medium text-muted-foreground">Número *</Label>
                        <Input
                          id="addressNumber"
                          placeholder="123"
                          value={addressNumber}
                          onChange={e => setAddressNumber(e.target.value)}
                          className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/40 focus:ring-accent/10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="addressComplement" className="text-xs font-medium text-muted-foreground">Complemento</Label>
                        <Input
                          id="addressComplement"
                          placeholder="Apto, Bloco..."
                          value={addressComplement}
                          onChange={e => setAddressComplement(e.target.value)}
                          className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/40 focus:ring-accent/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: Pickup data (local mode) ── */}
              {deliveryMode === 'pickup' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-accent" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Dados do Pedido
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="orderNumber" className="text-xs font-medium text-muted-foreground">Número da Comanda *</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="orderNumber"
                          placeholder="Ex: 42"
                          value={orderNumber}
                          onChange={e => setOrderNumber(e.target.value)}
                          className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 pl-9 focus:border-accent/40 focus:ring-accent/10"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/40 focus:ring-accent/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: Customer data (delivery mode) ── */}
              {deliveryMode === 'delivery' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCircle className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-accent" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Dados do Cliente
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/40 focus:ring-accent/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground">Telefone *</Label>
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="h-11 rounded-xl bg-secondary/30 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/40 focus:ring-accent/10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* ── Footer: Total & CTA ── */}
          <div className="bg-card">
            <div className="mx-5 separator-gradient" />
            <div className="px-5 py-5 space-y-4">
              {/* Subtotal per item */}
              <div className="space-y-1.5">
                {cart.map(item => (
                  <div key={item.recipe_id} className="flex justify-between text-xs text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span className="truncate max-w-[60%]">{item.quantity}× {item.name}</span>
                    <span className="font-mono-numbers">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total</span>
                <span className="text-2xl font-bold text-accent font-mono-numbers">
                  R$ {cartTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* CTA */}
              <button
                onClick={handleSubmitOrder}
                disabled={sending || !customerName.trim() || (deliveryMode === 'pickup' && !orderNumber.trim()) || (deliveryMode === 'delivery' && (!customerPhone.trim() || !address.trim() || !addressNumber.trim()))}
                className="w-full h-12 rounded-full font-semibold text-white text-base hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #8B6914, #A67C00)' }}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Finalizar Pedido'}
              </button>

              {/* Clear cart */}
              <button
                onClick={() => { setCart([]); setCheckoutOpen(false); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Limpar carrinho
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hide scrollbar */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}.cardapio-page::-webkit-scrollbar{display:none}.cardapio-page{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default Cardapio;
