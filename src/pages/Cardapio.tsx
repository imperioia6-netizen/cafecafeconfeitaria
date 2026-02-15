import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Minus, Loader2, ShoppingCart, CheckCircle2, X, UserCircle, MapPin, Store } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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

type CartItem = { recipe_id: string; name: string; price: number; quantity: number; photo_url?: string | null };

const Cardapio = () => {
  const { data: recipes, isLoading } = useActiveRecipes();
  const { user, viewAs, setViewAs } = useAuth();
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

  const addToCart = (recipe: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.recipe_id === recipe.id);
      if (existing) {
        return prev.map(c => c.recipe_id === recipe.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { recipe_id: recipe.id, name: recipe.name, price: Number(recipe.sale_price), quantity: 1, photo_url: recipe.photo_url }];
    });
  };

  const removeFromCart = (recipeId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.recipe_id === recipeId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.recipe_id !== recipeId);
      return prev.map(c => c.recipe_id === recipeId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const handleSubmitOrder = async () => {
    if (!customerName.trim() || cart.length === 0) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-order', {
        body: {
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          items: cart.map(c => ({ recipe_id: c.recipe_id, quantity: c.quantity })),
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
          <h1 className="text-3xl font-bold text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Pedido enviado!
          </h1>
          <p className="text-muted-foreground">
            Seu pedido <span className="font-semibold text-foreground">{success.order_number}</span> foi recebido com sucesso.
          </p>
          <p className="text-xl font-bold text-foreground font-mono-numbers">
            Total: R$ {success.total.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-sm text-muted-foreground">Aguarde o preparo. Você será chamado quando estiver pronto.</p>
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

  return (
    <div className={`min-h-screen bg-background hero-gradient text-foreground pb-24 cardapio-page overflow-y-auto ${isSimulating ? 'pt-[105px]' : 'pt-[73px]'}`}>
      {/* Simulation top bar */}
      {isSimulating && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-warning z-[60] flex items-center justify-center">
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

      {/* Header - dark cinematic */}
      <header className={`fixed ${isSimulating ? 'top-8' : 'top-0'} left-0 right-0 z-50 border-b border-sidebar-border shadow-lg`} style={{ background: 'linear-gradient(135deg, hsl(24 35% 15%), hsl(24 30% 10%))' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gradient-gold whitespace-nowrap" style={{ fontFamily: "'Playfair Display', serif" }}>
            🍰 Cardápio
          </h1>
          <div className="flex-1 max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-sidebar-accent/60 backdrop-blur-sm border border-sidebar-border text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
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
            <button onClick={() => isSimulating ? exitSimulation() : navigate('/profile')} className="cursor-pointer">
              <Avatar className="h-9 w-9 border-2 border-accent/40">
                {profilePhoto && <AvatarImage src={profilePhoto} alt={profileName || ''} />}
                <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
                  {profileName ? getInitials(profileName) : <UserCircle className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <button onClick={() => navigate('/auth')} className="p-1.5 rounded-full hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
              <UserCircle className="h-6 w-6 text-sidebar-foreground/60" />
            </button>
          )}
        </div>
      </header>

      {/* Categories section */}
      <section className={`sticky ${isSimulating ? 'top-[105px]' : 'top-[73px]'} z-40 bg-background/90 backdrop-blur-xl border-b border-border/50`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold mb-3 tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Nossos Produtos
          </h2>
          <div className="separator-gradient mb-4 opacity-60" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(recipe => {
              const qty = getCartQty(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="bg-card border border-border/60 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow duration-300"
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
                    <div className="flex items-end justify-between">
                      <p className="text-base font-semibold tracking-wide text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        R$ {Number(recipe.sale_price).toFixed(2).replace('.', ',')}
                      </p>
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(recipe)}
                          className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground hover:brightness-110 transition-all shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(recipe.id)}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>{qty}</span>
                          <button
                            onClick={() => addToCart(recipe)}
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

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t border-sidebar-border shadow-[0_-4px_20px_rgba(0,0,0,0.2)]" style={{ background: 'hsl(24 35% 15% / 0.95)' }}>
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
              Fazer Pedido
            </button>
          </div>
        </div>
      )}

      {/* Checkout Sheet sidebar */}
      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-md p-0 border-l border-border/40 flex flex-col"
          style={{ background: 'linear-gradient(180deg, hsl(24 30% 14%), hsl(24 25% 8%))' }}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/30">
            <SheetTitle className="text-xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Seu Pedido
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="py-5 space-y-6">
              {/* Cart items */}
              <div>
                <p className="uppercase text-[11px] tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Itens do carrinho</p>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.recipe_id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-2.5 border border-border/20">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🍰</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono-numbers">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => removeFromCart(item.recipe_id)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                          <Minus className="h-3 w-3 text-secondary-foreground" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.quantity}</span>
                        <button onClick={() => addToCart({ id: item.recipe_id, name: item.name, sale_price: item.price, photo_url: item.photo_url })} className="w-6 h-6 rounded-full bg-accent flex items-center justify-center hover:brightness-110 transition-all">
                          <Plus className="h-3 w-3 text-accent-foreground" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-foreground font-mono-numbers w-16 text-right flex-shrink-0">
                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.4), transparent)' }} />

              {/* Customer data */}
              <div>
                <p className="uppercase text-[11px] tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Dados do cliente</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs text-muted-foreground">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="bg-secondary/50 border-border/60 rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs text-muted-foreground">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="bg-secondary/50 border-border/60 rounded-xl h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.4), transparent)' }} />

              {/* Delivery mode */}
              <div>
                <p className="uppercase text-[11px] tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Como receber</p>
                <RadioGroup value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as 'pickup' | 'delivery')} className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      deliveryMode === 'pickup'
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border/40 bg-secondary/20 hover:bg-secondary/30'
                    }`}
                  >
                    <RadioGroupItem value="pickup" className="sr-only" />
                    <Store className={`h-4 w-4 ${deliveryMode === 'pickup' ? 'text-accent' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${deliveryMode === 'pickup' ? 'text-accent' : 'text-muted-foreground'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>Retirada</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      deliveryMode === 'delivery'
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border/40 bg-secondary/20 hover:bg-secondary/30'
                    }`}
                  >
                    <RadioGroupItem value="delivery" className="sr-only" />
                    <MapPin className={`h-4 w-4 ${deliveryMode === 'delivery' ? 'text-accent' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${deliveryMode === 'delivery' ? 'text-accent' : 'text-muted-foreground'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>Entrega</span>
                  </label>
                </RadioGroup>

                {deliveryMode === 'delivery' && (
                  <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-xs text-muted-foreground">Endereço *</Label>
                      <Input
                        id="address"
                        placeholder="Rua, Avenida..."
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="bg-secondary/50 border-border/60 rounded-xl h-10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="addressNumber" className="text-xs text-muted-foreground">Número *</Label>
                        <Input
                          id="addressNumber"
                          placeholder="123"
                          value={addressNumber}
                          onChange={e => setAddressNumber(e.target.value)}
                          className="bg-secondary/50 border-border/60 rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="addressComplement" className="text-xs text-muted-foreground">Complemento</Label>
                        <Input
                          id="addressComplement"
                          placeholder="Apto, Bloco..."
                          value={addressComplement}
                          onChange={e => setAddressComplement(e.target.value)}
                          className="bg-secondary/50 border-border/60 rounded-xl h-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer - Total & CTA */}
          <div className="px-6 py-5 border-t border-border/30 space-y-4" style={{ background: 'hsl(24 30% 10% / 0.8)', backdropFilter: 'blur(12px)' }}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total</span>
              <span className="text-2xl font-bold text-accent font-mono-numbers">
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={sending || !customerName.trim() || (deliveryMode === 'delivery' && (!address.trim() || !addressNumber.trim()))}
              className="w-full bg-accent hover:brightness-110 text-accent-foreground rounded-full h-12 text-base font-semibold glow-accent"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Pedido'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hide scrollbar */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}.cardapio-page::-webkit-scrollbar{display:none}.cardapio-page{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default Cardapio;
