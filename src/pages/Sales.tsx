import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ShoppingCart, Loader2, Plus, Minus, X, Sparkles, UserCircle, Check, ClipboardList, Hash, User } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useCreateSale, useTodaySales, type CartItem } from '@/hooks/useSales';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { Constants } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const channelLabels: Record<string, string> = { balcao: 'Balcão', delivery: 'Delivery' };
const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };

const Sales = () => {
  const { user } = useAuth();
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { data: todaySales, isLoading: salesLoading } = useTodaySales();
  const { data: allCustomers } = useCustomers();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<string>('balcao');
  const [payment, setPayment] = useState<string>('dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');

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
        unit_price: item.recipes?.sale_price ?? 0,
        max_available: item.slices_available,
      }]);
    }
  };

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
        order_number: orderNumber || undefined,
        table_number: tableNumber || undefined,
        customer_name: customerName || undefined,
      });
      toast.success('Venda registrada!');
      setCart([]);
      setOrderNumber('');
      setTableNumber('');
      setCustomerName('');
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar venda'); }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Ponto de venda</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Products — 3 cols */}
          <div className="lg:col-span-3">
            <div className="card-cinematic rounded-xl">
              <div className="p-4 md:p-6">
                <h3 className="text-base font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Produtos Disponíveis</h3>
                {invLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : !availableItems.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem produtos em estoque.</p>
                ) : (
                  <div className="grid gap-3 grid-cols-2">
                    {availableItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-accent/30 transition-all duration-500 text-left group hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5"
                        style={{ background: 'hsl(var(--card) / 0.6)' }}
                      >
                        {/* Product photo */}
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted/30">
                          {item.recipes?.photo_url ? (
                            <img
                              src={item.recipes.photo_url}
                              alt={item.recipes?.name ?? ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">
                              📷
                            </div>
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
          </div>

          {/* Cart — 2 cols */}
          <div className="lg:col-span-2">
            <div className="card-cinematic gradient-border rounded-xl sticky top-24">
              <div className="p-4 md:p-6 space-y-4">
                <h3 className="flex items-center gap-2 text-base font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <ShoppingCart className="h-4 w-4 text-accent" />
                  Carrinho ({cart.length})
                </h3>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/60">Adicione produtos</p>
                  </div>
                ) : (
                  <>
                    {cart.map(item => (
                      <div key={item.inventory_id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 glass">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{item.recipe_name}</p>
                          <Input
                            type="number" className="w-24 h-7 text-xs input-glow" min={0} step="0.01"
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

                    {/* Order Annotations */}
                    <div className="space-y-2 pt-2 border-t border-border/20">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3" /> Anotações do Pedido
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Comanda</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Nº comanda"
                            value={orderNumber}
                            onChange={e => setOrderNumber(e.target.value)}
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Mesa</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Nº mesa"
                            value={tableNumber}
                            onChange={e => setTableNumber(e.target.value)}
                            maxLength={10}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Nome do Cliente</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Nome (opcional)"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                    </div>

                    {/* Customer Selector */}
                    <div className="space-y-1">
                      <Label className="text-xs">Cliente CRM (opcional)</Label>
                      <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-start h-9 text-xs font-normal">
                            <UserCircle className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            {selectedCustomerId
                              ? (allCustomers || []).find(c => c.id === selectedCustomerId)?.name || 'Cliente'
                              : 'Não identificado'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." className="text-xs" />
                            <CommandList>
                              <CommandEmpty>Nenhum cliente.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem onSelect={() => { setSelectedCustomerId(null); setCustomerPopoverOpen(false); }}>
                                  <Check className={cn("mr-2 h-3 w-3", !selectedCustomerId ? "opacity-100" : "opacity-0")} />
                                  Não identificado
                                </CommandItem>
                                {(allCustomers || []).map(c => (
                                  <CommandItem key={c.id} onSelect={() => { setSelectedCustomerId(c.id); setCustomerPopoverOpen(false); }}>
                                    <Check className={cn("mr-2 h-3 w-3", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                                    {c.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Canal</Label>
                        <Select value={channel} onValueChange={setChannel}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Constants.public.Enums.sales_channel.filter(c => c !== 'ifood').map(c => (
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

                    <div className="flex items-center justify-between pt-4">
                      <div className="separator-gradient flex-1 mr-4" />
                      <span className="text-4xl font-bold font-mono-numbers text-gradient-gold"
                        style={{ WebkitTextFillColor: total > 0 ? undefined : 'hsl(24, 10%, 45%)' }}>
                        R$ {total.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      onClick={handleSale}
                      className="w-full h-12 text-sm font-semibold shine-effect gap-2"
                      style={{
                        background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%), hsl(24 60% 23%))',
                        boxShadow: '0 4px 24px hsl(24 60% 23% / 0.35)',
                      }}
                      disabled={createSale.isPending || total <= 0}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Finalizar Venda
                      </span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Today's sales */}
        <div className="card-cinematic rounded-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Vendas de Hoje</h3>
            {salesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !todaySales?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada hoje.</p>
            ) : (
              <div className="space-y-2">
                {todaySales.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border/20 hover:border-accent/20 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-muted-foreground font-mono-numbers">
                        {new Date(s.sold_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant="secondary">{channelLabels[s.channel] ?? s.channel}</Badge>
                      <span className="text-xs text-muted-foreground">{paymentLabels[s.payment_method]}</span>
                      {s.order_number && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Hash className="h-2.5 w-2.5" />{s.order_number}
                        </Badge>
                      )}
                      {s.table_number && (
                        <Badge variant="outline" className="text-[10px]">Mesa {s.table_number}</Badge>
                      )}
                      {s.customer_name && (
                        <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />{s.customer_name}
                        </span>
                      )}
                    </div>
                    <span className="font-mono-numbers font-semibold group-hover:text-accent transition-colors">R$ {Number(s.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default Sales;
