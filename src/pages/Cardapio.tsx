import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Minus, Loader2, ShoppingCart, CheckCircle2, X, UserCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    <div className={`min-h-screen bg-background hero-gradient text-foreground pb-24 ${isSimulating ? 'pt-[105px]' : 'pt-[73px]'}`}>
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
          <h2 className="text-lg font-semibold mb-3 text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Nossos Produtos
          </h2>
          <div className="separator-gradient mb-3" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categoryFilters.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  category === c.key
                    ? 'bg-accent text-accent-foreground shadow-md glow-accent'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
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

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Confirmar Pedido
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2 max-h-48 overflow-y-auto">
              {cart.map(item => (
                <div key={item.recipe_id} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold text-foreground font-mono-numbers">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-xl font-bold text-accent font-mono-numbers">
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <Button
              onClick={handleSubmitOrder}
              disabled={sending || !customerName.trim()}
              className="w-full bg-accent hover:brightness-110 text-accent-foreground rounded-full h-12 text-base font-semibold"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Pedido'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hide scrollbar */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default Cardapio;
