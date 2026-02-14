import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, DollarSign, Lock, Unlock, Clock, CreditCard, Banknote, Smartphone, Pencil, Trash2 } from 'lucide-react';
import { useOpenRegisters, useClosingHistory, useOpenRegister, useCloseRegister, useDeleteClosing, useUpdateClosing, registerLabels, type CashRegisterName } from '@/hooks/useCashRegister';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const channelLabels: Record<string, string> = { caixa_1: 'Caixa 1', caixa_2: 'Caixa 2', delivery: 'Delivery' };
const paymentIcons: Record<string, React.ElementType> = { pix: Smartphone, credito: CreditCard, debito: CreditCard, dinheiro: Banknote, refeicao: CreditCard };

const CashRegisterPage = () => {
  const { user, isOwner } = useAuth();
  const { data: openRegisters, isLoading: regLoading } = useOpenRegisters();
  const { data: history, isLoading: histLoading } = useClosingHistory();
  const openRegister = useOpenRegister();
  const closeRegister = useCloseRegister();
  const deleteClosing = useDeleteClosing();
  const updateClosing = useUpdateClosing();

  const [selectedName, setSelectedName] = useState<CashRegisterName>('caixa_1');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const handleOpen = async () => {
    if (!user) return;
    try {
      await openRegister.mutateAsync({ name: selectedName, opened_by: user.id, opening_balance: parseFloat(openingBalance) || 0 });
      toast.success(`${registerLabels[selectedName]} aberto!`);
      setOpeningBalance('');
      setOpenDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleClose = async (registerId: string) => {
    if (!user) return;
    try {
      await closeRegister.mutateAsync({ registerId, closedBy: user.id, notes: closeNotes || undefined });
      toast.success('Caixa fechado com sucesso!');
      setCloseNotes('');
      setClosingId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClosing.mutateAsync(id);
      toast.success('Fechamento excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await updateClosing.mutateAsync({ id: editId, notes: editNotes });
      toast.success('Fechamento atualizado');
      setEditId(null);
      setEditNotes('');
    } catch { toast.error('Erro ao atualizar'); }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caixas</h1>
            <p className="text-muted-foreground mt-1">Abrir, fechar e gerenciar caixas</p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20"><Unlock className="h-4 w-4" /> Abrir Caixa</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader><DialogTitle>Abrir Novo Caixa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Caixa</Label>
                  <Select value={selectedName} onValueChange={v => setSelectedName(v as CashRegisterName)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caixa_1">Caixa 1</SelectItem>
                      <SelectItem value="caixa_2">Caixa 2</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Troco Inicial (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" className="h-11" />
                </div>
                <Button onClick={handleOpen} disabled={openRegister.isPending} className="w-full h-11">
                  {openRegister.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Abrir Caixa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Open registers */}
        <div className="grid gap-5 md:grid-cols-3">
          {regLoading ? (
            <div className="col-span-3 flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !openRegisters?.length ? (
            <div className="col-span-3">
              <Card className="card-premium"><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum caixa aberto.</CardContent></Card>
            </div>
          ) : openRegisters.map((reg: any, i: number) => (
            <Card key={reg.id} className={`card-premium gradient-border opacity-0 animate-fade-in`} style={{ animationDelay: `${i * 100}ms` }}>
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
                {closingId === reg.id ? (
                  <div className="space-y-2">
                    <Textarea placeholder="Observações do fechamento..." value={closeNotes} onChange={e => setCloseNotes(e.target.value)} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => handleClose(reg.id)} disabled={closeRegister.isPending} className="flex-1 bg-gradient-to-r from-destructive to-destructive/80">
                        {closeRegister.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Confirmar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setClosingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setClosingId(reg.id)} className="w-full">
                    <Lock className="h-3 w-3 mr-2" /> Fechar Caixa
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Closing history as timeline */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {histLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !history?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum fechamento registrado.</p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                {history.map((c: any) => (
                  <div key={c.id} className="relative flex items-start gap-4 py-4 pl-1">
                    <div className="relative z-10 h-[10px] w-[10px] rounded-full mt-1.5 bg-primary ring-4 ring-background" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {new Date(c.closed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge variant="secondary">{channelLabels[(c.cash_registers as any)?.name] ?? '—'}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{c.total_transactions} vendas</span>
                        <span className="text-sm font-bold font-mono-numbers">R$ {Number(c.total_sales).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(c.closing_details ?? []).map((d: any) => {
                          const PayIcon = paymentIcons[d.payment_method] || CreditCard;
                          return (
                            <Badge key={d.id} variant="outline" className="text-xs gap-1">
                              <PayIcon className="h-3 w-3" />
                              {paymentLabels[d.payment_method]}: R$ {Number(d.total).toFixed(2)}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Edit/Delete - owner only */}
                      {isOwner && (
                        <div className="flex items-center gap-2 pt-1">
                          {editId === c.id ? (
                            <div className="flex-1 flex gap-2 items-end">
                              <div className="flex-1">
                                <Textarea placeholder="Observações..." value={editNotes} onChange={e => setEditNotes(e.target.value)} className="text-sm h-16" />
                              </div>
                              <Button size="sm" onClick={handleEdit} disabled={updateClosing.isPending}>
                                {updateClosing.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
                            </div>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditId(c.id); setEditNotes(c.notes || ''); }}>
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
                                    <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      )}

                      {c.notes && editId !== c.id && (
                        <p className="text-xs text-muted-foreground/60 italic">Obs: {c.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CashRegisterPage;
