import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Clock, Lock, Loader2, Smartphone, CreditCard, Banknote } from 'lucide-react';
import { useRegisterSalesSummary, registerLabels } from '@/hooks/useCashRegister';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const paymentIcons: Record<string, React.ElementType> = { pix: Smartphone, credito: CreditCard, debito: CreditCard, dinheiro: Banknote, refeicao: CreditCard };
const channelLabels: Record<string, string> = { caixa_1: 'Caixa 1', caixa_2: 'Caixa 2', delivery: 'Delivery' };

interface Props {
  register: any;
  index: number;
  onClose: (registerId: string) => void;
}

export default function OpenRegisterCard({ register: reg, index, onClose }: Props) {
  const { data: summary, isLoading: summaryLoading } = useRegisterSalesSummary(reg.id, reg.opened_at);

  return (
    <Card className="card-premium gradient-border opacity-0 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            {channelLabels[reg.name] ?? reg.name}
          </span>
          <div className="relative pulse-dot">
            <Badge className="bg-success/15 text-success border border-success/30">Aberto</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Aberto às {new Date(reg.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <p className="text-sm">Troco: <span className="font-mono-numbers font-semibold">R$ {Number(reg.opening_balance).toFixed(2)}</span></p>

        {/* Real-time sales summary */}
        <div className="border-t border-border/50 pt-3 space-y-2">
          {summaryLoading ? (
            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : summary && summary.totalCount > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{summary.totalCount} vendas</span>
                <span className="font-bold font-mono-numbers">R$ {summary.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.byPayment).map(([pm, d]) => {
                  const Icon = paymentIcons[pm] || CreditCard;
                  return (
                    <Badge key={pm} variant="outline" className="text-xs gap-1">
                      <Icon className="h-3 w-3" />
                      {paymentLabels[pm] ?? pm}: R$ {d.total.toFixed(2)}
                    </Badge>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center">Nenhuma venda ainda</p>
          )}
        </div>

        <Button size="sm" variant="outline" onClick={() => onClose(reg.id)} className="w-full">
          <Lock className="h-3 w-3 mr-2" /> Fechar Caixa
        </Button>
      </CardContent>
    </Card>
  );
}
