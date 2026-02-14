import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Unlock } from 'lucide-react';
import { useOpenRegisters, useOpenRegister, useClosingHistory, registerLabels, type CashRegisterName, type DateFilter } from '@/hooks/useCashRegister';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import DayKpis from '@/components/cashregister/DayKpis';
import OpenRegisterCard from '@/components/cashregister/OpenRegisterCard';
import ClosingDialog from '@/components/cashregister/ClosingDialog';
import ClosingCard from '@/components/cashregister/ClosingCard';

const CashRegisterPage = () => {
  const { user, isOwner } = useAuth();
  const { data: openRegisters, isLoading: regLoading } = useOpenRegisters();
  const openRegister = useOpenRegister();

  const [selectedName, setSelectedName] = useState<CashRegisterName>('caixa_1');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  // Closing dialog
  const [closingRegister, setClosingRegister] = useState<any>(null);

  // History filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [registerFilter, setRegisterFilter] = useState('all');
  const { data: historyData, isLoading: histLoading } = useClosingHistory(dateFilter, registerFilter);

  const handleOpen = async () => {
    if (!user) return;
    try {
      await openRegister.mutateAsync({ name: selectedName, opened_by: user.id, opening_balance: parseFloat(openingBalance) || 0 });
      toast.success(`${registerLabels[selectedName]} aberto!`);
      setOpeningBalance('');
      setOpenDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCloseClick = (registerId: string) => {
    const reg = openRegisters?.find((r: any) => r.id === registerId);
    if (reg) setClosingRegister(reg);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caixas</h1>
            <p className="text-muted-foreground mt-1">Gerenciamento financeiro em tempo real</p>
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

        {/* Day KPIs */}
        <DayKpis />

        {/* Open registers */}
        <div className="grid gap-5 md:grid-cols-3">
          {regLoading ? (
            <div className="col-span-3 flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !openRegisters?.length ? (
            <div className="col-span-3">
              <Card className="card-premium"><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum caixa aberto.</CardContent></Card>
            </div>
          ) : openRegisters.map((reg: any, i: number) => (
            <OpenRegisterCard key={reg.id} register={reg} index={i} onClose={handleCloseClick} />
          ))}
        </div>

        {/* Closing dialog */}
        <ClosingDialog
          register={closingRegister}
          userId={user?.id ?? ''}
          open={!!closingRegister}
          onOpenChange={(open) => { if (!open) setClosingRegister(null); }}
        />

        {/* Closing history */}
        <Card className="card-premium">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg">Histórico de Fechamentos</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={dateFilter} onValueChange={v => setDateFilter(v as DateFilter)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="week">Últimos 7 dias</SelectItem>
                    <SelectItem value="month">Mês atual</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={registerFilter} onValueChange={setRegisterFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="caixa_1">Caixa 1</SelectItem>
                    <SelectItem value="caixa_2">Caixa 2</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {histLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : !historyData?.closings?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum fechamento encontrado.</p>
            ) : (
              <div className="space-y-3">
                {historyData.closings.map((c: any) => (
                  <ClosingCard key={c.id} closing={c} profileMap={historyData.profileMap} isOwner={isOwner} />
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
