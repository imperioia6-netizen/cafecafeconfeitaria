import { useAutoPromotions, useGeneratePromotions } from '@/hooks/useSmartFeatures';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Clock, DollarSign, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  enviada: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  vendida: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expirada: 'bg-muted text-muted-foreground border-border',
};

const AutoPromotionsPanel = () => {
  const { data: promotions, isLoading } = useAutoPromotions();
  const generateMut = useGeneratePromotions();

  const handleGenerate = () => {
    generateMut.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(data?.message || 'Promoções verificadas!');
      },
      onError: () => toast.error('Erro ao gerar promoções'),
    });
  };

  const active = promotions?.filter(p => p.status === 'pendente' || p.status === 'enviada') || [];
  const history = promotions?.filter(p => p.status === 'vendida' || p.status === 'expirada') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Zap className="h-5 w-5 text-accent" />
            Promoções Automáticas
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Itens com 12h+ no estoque geram promoção automática
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateMut.isPending}
          size="sm"
          className="gap-1.5"
          style={{ background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generateMut.isPending ? 'animate-spin' : ''}`} />
          Verificar Agora
        </Button>
      </div>

      {/* Active promotions */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs mt-3">Carregando...</p>
        </div>
      ) : active.length === 0 ? (
        <div className="text-center py-12 card-cinematic rounded-xl">
          <Zap className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma promoção ativa</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Verificar Agora" para checar itens 12h+</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map(promo => (
            <div key={promo.id} className="card-cinematic rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={statusColors[promo.status]}>
                  {promo.status}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {promo.hours_in_stock}h no estoque
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground line-through">
                    R$ {Number(promo.original_price).toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-accent glow-gold">
                    R$ {Number(promo.promo_price).toFixed(2)}
                  </span>
                </div>
                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                  -{promo.discount_percent}%
                </Badge>
              </div>
              {promo.message_content && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 leading-relaxed">
                  {promo.message_content}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs flex-1">
                  <Send className="h-3 w-3" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Histórico</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map(promo => (
              <div key={promo.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${statusColors[promo.status]}`}>
                    {promo.status}
                  </Badge>
                  <span className="text-xs">
                    R$ {Number(promo.original_price).toFixed(2)} → R$ {Number(promo.promo_price).toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(promo.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoPromotionsPanel;
