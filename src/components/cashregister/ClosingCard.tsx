import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronDown, Smartphone, CreditCard, Banknote, Pencil, Trash2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDeleteClosing, useUpdateClosing } from '@/hooks/useCashRegister';
import { toast } from 'sonner';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const paymentIcons: Record<string, React.ElementType> = { pix: Smartphone, credito: CreditCard, debito: CreditCard, dinheiro: Banknote, refeicao: CreditCard };
const channelLabels: Record<string, string> = { caixa_1: 'Caixa 1', caixa_2: 'Caixa 2', delivery: 'Delivery' };

interface Props {
  closing: any;
  profileMap: Record<string, string>;
  isOwner: boolean;
}

export default function ClosingCard({ closing: c, profileMap, isOwner }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const deleteClosing = useDeleteClosing();
  const updateClosing = useUpdateClosing();

  const reg = c.cash_registers as any;
  const regName = channelLabels[reg?.name] ?? '—';
  const closedByName = profileMap[c.closed_by] ?? '—';
  const openedByName = reg?.opened_by ? (profileMap[reg.opened_by] ?? '—') : '—';
  const diff = c.cash_difference !== null && c.cash_difference !== undefined ? Number(c.cash_difference) : null;

  const handleDelete = async () => {
    try {
      await deleteClosing.mutateAsync(c.id);
      toast.success('Fechamento excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleEdit = async () => {
    try {
      await updateClosing.mutateAsync({ id: c.id, notes: editNotes });
      toast.success('Atualizado');
      setEditMode(false);
    } catch { toast.error('Erro ao atualizar'); }
  };

  return (
    <Card className="card-premium">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant="secondary" className="shrink-0">{regName}</Badge>
                <span className="text-sm font-semibold">
                  {new Date(c.closed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-mono-numbers">R$ {Number(c.total_sales).toFixed(2)}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>{c.total_transactions} vendas</span>
              <span>Aberto por {openedByName}</span>
              <span>Fechado por {closedByName}</span>
              {diff !== null && (
                diff === 0 ? (
                  <Badge className="bg-success/15 text-success border border-success/30 text-xs gap-1 h-5">
                    <CheckCircle className="h-2.5 w-2.5" /> Conferido
                  </Badge>
                ) : diff > 0 ? (
                  <Badge className="bg-success/15 text-success border border-success/30 text-xs h-5">+R$ {diff.toFixed(2)}</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs gap-1 h-5">
                    <AlertTriangle className="h-2.5 w-2.5" /> -R$ {Math.abs(diff).toFixed(2)}
                  </Badge>
                )
              )}
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {/* Payment breakdown */}
            <div className="flex flex-wrap gap-1.5">
              {(c.closing_details ?? []).map((d: any) => {
                const Icon = paymentIcons[d.payment_method] || CreditCard;
                return (
                  <Badge key={d.id} variant="outline" className="text-xs gap-1">
                    <Icon className="h-3 w-3" />
                    {paymentLabels[d.payment_method]}: R$ {Number(d.total).toFixed(2)} ({d.transaction_count}x)
                  </Badge>
                );
              })}
            </div>

            {/* Cash reconciliation details */}
            {c.counted_cash !== null && c.counted_cash !== undefined && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Dinheiro contado: <span className="font-mono-numbers font-medium">R$ {Number(c.counted_cash).toFixed(2)}</span></p>
              </div>
            )}

            {/* Notes */}
            {c.notes && !editMode && (
              <p className="text-xs text-muted-foreground/70 italic">Obs: {c.notes}</p>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="flex items-center gap-2 pt-1">
                {editMode ? (
                  <div className="flex-1 flex gap-2 items-end">
                    <div className="flex-1">
                      <Textarea placeholder="Observações..." value={editNotes} onChange={e => setEditNotes(e.target.value)} className="text-sm h-16" />
                    </div>
                    <Button size="sm" onClick={handleEdit} disabled={updateClosing.isPending}>
                      {updateClosing.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                  </div>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditMode(true); setEditNotes(c.notes || ''); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3 mr-1" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir fechamento?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
