import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, DollarSign, Lock, Unlock } from 'lucide-react';
import { useOpenRegisters, useClosingHistory, useOpenRegister, useCloseRegister, registerLabels, type CashRegisterName } from '@/hooks/useCashRegister';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const paymentLabels: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', refeicao: 'Refeição' };
const channelLabels: Record<string, string> = { caixa_1: 'Caixa 1', caixa_2: 'Caixa 2', delivery: 'Delivery' };

const CashRegisterPage = () => {
  const { user } = useAuth();
  const { data: openRegisters, isLoading: regLoading } = useOpenRegisters();
  const { data: history, isLoading: histLoading } = useClosingHistory();
  const openRegister = useOpenRegister();
  const closeRegister = useCloseRegister();

  const [selectedName, setSelectedName] = useState<CashRegisterName>('caixa_1');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpen = async () => {
    if (!user) return;
    try {
      await openRegister.mutateAsync({
        name: selectedName,
        opened_by: user.id,
        opening_balance: parseFloat(openingBalance) || 0,
      });
      toast.success(`${registerLabels[selectedName]} aberto!`);
      setOpeningBalance('');
      setOpenDialog(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleClose = async (registerId: string) => {
    if (!user) return;
    try {
      await closeRegister.mutateAsync({
        registerId,
        closedBy: user.id,
        notes: closeNotes || undefined,
      });
      toast.success('Caixa fechado com sucesso!');
      setCloseNotes('');
      setClosingId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caixas</h1>
            <p className="text-muted-foreground mt-1">Abrir, fechar e gerenciar caixas</p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button><Unlock className="h-4 w-4 mr-2" /> Abrir Caixa</Button>
            </DialogTrigger>
            <DialogContent>
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
                  <Input type="number" min="0" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" />
                </div>
                <Button onClick={handleOpen} disabled={openRegister.isPending} className="w-full">
                  {openRegister.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Abrir Caixa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Open registers */}
        <div className="grid gap-4 md:grid-cols-3">
          {regLoading ? (
            <div className="col-span-3 flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !openRegisters?.length ? (
            <div className="col-span-3">
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum caixa aberto.</CardContent></Card>
            </div>
          ) : openRegisters.map((reg: any) => (
            <Card key={reg.id} className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    {channelLabels[reg.name] ?? reg.name}
                  </span>
                  <Badge className="bg-green-600/20 text-green-700">Aberto</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Aberto às {new Date(reg.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm">Troco: <span className="font-mono font-semibold">R$ {Number(reg.opening_balance).toFixed(2)}</span></p>
                {closingId === reg.id ? (
                  <div className="space-y-2">
                    <Textarea placeholder="Observações do fechamento..." value={closeNotes} onChange={e => setCloseNotes(e.target.value)} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => handleClose(reg.id)} disabled={closeRegister.isPending} className="flex-1">
                        {closeRegister.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Confirmar Fechamento
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

        {/* Closing history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {histLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !history?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum fechamento registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Caixa</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{new Date(c.closed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell><Badge variant="secondary">{channelLabels[(c.cash_registers as any)?.name] ?? '—'}</Badge></TableCell>
                      <TableCell>{c.total_transactions}</TableCell>
                      <TableCell className="font-mono font-semibold">R$ {Number(c.total_sales).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(c.closing_details ?? []).map((d: any) => (
                            <Badge key={d.id} variant="outline" className="text-xs">
                              {paymentLabels[d.payment_method] ?? d.payment_method}: R$ {Number(d.total).toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CashRegisterPage;
