import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Loader2, Trash2 } from 'lucide-react';
import { useInventory, useDiscardInventory, type InventoryItem } from '@/hooks/useInventory';
import { toast } from 'sonner';

function getStockAge(producedAt: string) {
  const hours = (Date.now() - new Date(producedAt).getTime()) / (1000 * 60 * 60);
  return hours;
}

function StockStatusBadge({ hours }: { hours: number }) {
  if (hours > 12) return <Badge variant="destructive">Crítico</Badge>;
  if (hours > 8) return <Badge className="bg-warning text-warning-foreground">Atenção</Badge>;
  return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
}

const Inventory = () => {
  const { data: inventory, isLoading } = useInventory();
  const discardMutation = useDiscardInventory();
  const [filter, setFilter] = useState<string>('all');

  const filtered = inventory?.filter(item => {
    if (filter === 'all') return true;
    const hours = getStockAge(item.produced_at);
    if (filter === 'critico') return hours > 12;
    if (filter === 'atencao') return hours > 8 && hours <= 12;
    if (filter === 'normal') return hours <= 8;
    return true;
  });

  const handleDiscard = async (item: InventoryItem) => {
    try {
      await discardMutation.mutateAsync(item.id);
      toast.success('Item descartado');
    } catch {
      toast.error('Erro ao descartar');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
            <p className="text-muted-foreground mt-1">Controle em tempo real</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos em Estoque ({filtered?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !filtered?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto em estoque.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Fatias</TableHead>
                    <TableHead>Produção</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => {
                    const hours = getStockAge(item.produced_at);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.recipes?.name ?? '—'}</TableCell>
                        <TableCell className="font-mono">{item.slices_available}</TableCell>
                        <TableCell>{new Date(item.produced_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="font-mono">{hours.toFixed(1)}h</TableCell>
                        <TableCell><StockStatusBadge hours={hours} /></TableCell>
                        <TableCell>
                          {hours > 12 && (
                            <Button size="sm" variant="destructive" onClick={() => handleDiscard(item)} disabled={discardMutation.isPending}>
                              <Trash2 className="h-3 w-3 mr-1" /> Descartar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Inventory;
