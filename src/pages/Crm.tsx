import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import CustomerCard from '@/components/crm/CustomerCard';

import CustomerDetailSheet from '@/components/crm/CustomerDetailSheet';
import CrmDashboardKpis from '@/components/crm/CrmDashboardKpis';
import BirthdayTimeline from '@/components/crm/BirthdayTimeline';
import ReactivationPanel from '@/components/crm/ReactivationPanel';
import N8nSettingsPanel from '@/components/crm/N8nSettingsPanel';
import LeadsKanban from '@/components/crm/LeadsKanban';
import { Search, Users, Cake, AlertTriangle, Settings, ArrowUpDown, Columns3, MessageCircle } from 'lucide-react';

type SortKey = 'name' | 'total_spent' | 'last_purchase_at' | 'created_at';

const Crm = () => {
  const { loading, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: customers, isLoading } = useCustomers(statusFilter);

  if (!loading && !user) { navigate('/auth'); return null; }
  if (!loading && !isOwner) { navigate('/'); return null; }

  const all = customers || [];
  const activeCount = all.filter(c => c.status === 'ativo').length;
  const inactiveCount = all.filter(c => c.status === 'inativo').length;
  const newCount = all.filter(c => c.status === 'novo').length;

  const filtered = all
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.instagram_handle?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'total_spent': return Number(b.total_spent) - Number(a.total_spent);
        case 'last_purchase_at': return (b.last_purchase_at || '').localeCompare(a.last_purchase_at || '');
        case 'created_at': return (b.created_at || '').localeCompare(a.created_at || '');
        default: return a.name.localeCompare(b.name);
      }
    });

  const openDetail = (c: Customer) => {
    setSelectedCustomer(c);
    setSheetOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Title */}
        <div className="opacity-0 animate-fade-in animate-stagger-1">
          <h1 className="page-title-gradient">CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Relacionamento e marketing inteligente</p>
        </div>

        {/* KPIs */}
        <CrmDashboardKpis />

        <Tabs defaultValue="clientes" className="space-y-4">
          <TabsList className="glass-card border-border/30 p-1">
            <TabsTrigger value="clientes" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Users className="h-3.5 w-3.5" />Clientes
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Columns3 className="h-3.5 w-3.5" />Pipeline
            </TabsTrigger>
            <TabsTrigger value="aniversarios" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Cake className="h-3.5 w-3.5" />Aniversários
            </TabsTrigger>
            <TabsTrigger value="reativacao" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />Reativação
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Settings className="h-3.5 w-3.5" />Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="space-y-4">
            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'todos', label: `Todos (${all.length})` },
                { key: 'ativo', label: `Ativos (${activeCount})`, color: 'bg-emerald-500/10 text-emerald-400' },
                { key: 'inativo', label: `Inativos (${inactiveCount})`, color: 'bg-red-500/10 text-red-400' },
                { key: 'novo', label: `Novos (${newCount})`, color: 'bg-blue-500/10 text-blue-400' },
              ].map(s => (
                <Badge
                  key={s.key}
                  variant="outline"
                  className={`cursor-pointer text-xs py-1 px-3 transition-all ${statusFilter === s.key ? 'bg-accent/20 text-accent border-accent/40' : s.color || ''}`}
                  onClick={() => setStatusFilter(s.key)}
                >
                  {s.label}
                </Badge>
              ))}
            </div>

            {/* Search + Sort + Add */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 input-glow"
                />
              </div>
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-40 h-9">
                  <ArrowUpDown className="h-3 w-3 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="total_spent">Maior gasto</SelectItem>
                  <SelectItem value="last_purchase_at">Última compra</SelectItem>
                  <SelectItem value="created_at">Mais recente</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" onClick={() => window.open('https://wa.me/', '_blank')}>
                <MessageCircle className="h-4 w-4" />WhatsApp
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground text-xs mt-3">Carregando clientes...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum cliente encontrado</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Cadastre seu primeiro cliente para começar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(c => <CustomerCard key={c.id} customer={c} onClick={() => openDetail(c)} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pipeline">
            <LeadsKanban />
          </TabsContent>

          <TabsContent value="aniversarios">
            <BirthdayTimeline />
          </TabsContent>

          <TabsContent value="reativacao">
            <ReactivationPanel />
          </TabsContent>

          <TabsContent value="config">
            <N8nSettingsPanel />
          </TabsContent>
        </Tabs>

        <CustomerDetailSheet customer={selectedCustomer} open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>
    </AppLayout>
  );
};

export default Crm;
