import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, CreditCard, Banknote, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRegisterSalesSummary, useCloseRegister } from '@/hooks/useCashRegister';
import { toast } from 'sonner';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const paymentIcons: Record<string, React.ElementType> = { pix: Smartphone, credito: CreditCard, debito: CreditCard, dinheiro: Banknote, refeicao: CreditCard };
const channelLabels: Record<string, string> = { caixa_1: 'Caixa 1', caixa_2: 'Caixa 2', delivery: 'Delivery' };

interface Props {
  register: any;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClosingDialog({ register, userId, open, onOpenChange }: Props) {
  const { data: summary, isLoading } = useRegisterSalesSummary(register?.id, register?.opened_at);
  const closeRegister = useCloseRegister();
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');

  if (!register) return null;

  const openingBalance = Number(register.opening_balance);
  const cashSales = summary?.byPayment?.['dinheiro']?.total ?? 0;
  const expectedCash = openingBalance + cashSales;
  const counted = countedCash !== '' ? parseFloat(countedCash) : null;
  const difference = counted !== null ? counted - expectedCash : null;

  const handleConfirm = async () => {
    try {
      await closeRegister.mutateAsync({
        registerId: register.id,
        closedBy: userId,
        notes: notes || undefined,
        countedCash: counted ?? undefined,
      });
      toast.success('Caixa fechado com sucesso!');
      setCountedCash('');
      setNotes('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar {channelLabels[register.name] ?? register.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Resumo do Período</p>
            {isLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{summary?.totalCount ?? 0} vendas</span>
                  <span className="font-bold font-mono-numbers text-base">R$ {(summary?.totalSales ?? 0).toFixed(2)}</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(summary?.byPayment ?? {}).map(([pm, d]) => {
                    const Icon = paymentIcons[pm] || CreditCard;
                    return (
                      <div key={pm} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {paymentLabels[pm] ?? pm}
                        </span>
                        <span className="font-mono-numbers">
                          R$ {d.total.toFixed(2)} <span className="text-xs text-muted-foreground">({d.count}x)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Cash reconciliation */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Conferência de Dinheiro</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Esperado (troco + vendas)</span>
              <span className="font-mono-numbers font-semibold">R$ {expectedCash.toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor contado (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={countedCash}
                onChange={e => setCountedCash(e.target.value)}
                placeholder={expectedCash.toFixed(2)}
                className="h-10 font-mono-numbers"
              />
            </div>
            {difference !== null && (
              <div className="flex items-center gap-2">
                {difference === 0 ? (
                  <Badge className="bg-success/15 text-success border border-success/30 gap-1">
                    <CheckCircle className="h-3 w-3" /> Conferido
                  </Badge>
                ) : difference > 0 ? (
                  <Badge className="bg-success/15 text-success border border-success/30 gap-1">
                    +R$ {difference.toFixed(2)} sobra
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> -R$ {Math.abs(difference).toFixed(2)} falta
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea
              placeholder="Observações do fechamento..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm h-16"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleConfirm}
              disabled={closeRegister.isPending}
              className="flex-1 bg-gradient-to-r from-destructive to-destructive/80"
            >
              {closeRegister.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Fechamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
