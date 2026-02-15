import { useState, useMemo } from 'react';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Minus, Loader2, ShoppingCart, CheckCircle2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<{ order_number: string; total: number } | null>(null);

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
      <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div className="text-center max-w-sm space-y-6">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Pedido enviado!</h1>
          <p className="text-gray-500">Seu pedido <span className="font-semibold text-gray-900">{success.order_number}</span> foi recebido com sucesso.</p>
          <p className="text-lg font-bold text-gray-900">Total: R$ {success.total.toFixed(2).replace('.', ',')}</p>
          <p className="text-sm text-gray-400">Aguarde o preparo. Você será chamado quando estiver pronto.</p>
          <button
            onClick={handleNewOrder}
            className="w-full py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold text-red-600 whitespace-nowrap">🍰 Cardápio</h1>
          <div className="flex-1 max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 border-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
        </div>
      </header>

      {/* Categories */}
      <nav className="sticky top-[61px] z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categoryFilters.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === c.key
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(recipe => {
              const qty = getCartQty(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {recipe.photo_url ? (
                      <img
                        src={recipe.photo_url}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        {recipe.category === 'bolo' ? '🎂' : recipe.category === 'torta' ? '🥧' : recipe.category === 'salgado' ? '🥪' : recipe.category === 'bebida' ? '🥤' : recipe.category === 'doce' ? '🍬' : '🍴'}
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
                      {recipe.name}
                    </h3>
                    <div className="flex items-end justify-between">
                      <p className="text-base font-bold text-gray-900">
                        R$ {Number(recipe.sale_price).toFixed(2).replace('.', ',')}
                      </p>
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(recipe)}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(recipe.id)}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center">{qty}</span>
                          <button
                            onClick={() => addToCart(recipe)}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-red-600" />
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="px-6 py-2.5 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-md"
            >
              Fazer Pedido
            </button>
          </div>
        </div>
      )}

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md mx-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Confirmar Pedido</DialogTitle>
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

            <div className="border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
              {cart.map(item => (
                <div key={item.recipe_id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold text-gray-900">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-red-600">
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <Button
              onClick={handleSubmitOrder}
              disabled={sending || !customerName.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full h-12 text-base font-semibold"
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
