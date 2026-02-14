import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import CustomerCard from '@/components/crm/CustomerCard';
import CustomerDetailSheet from '@/components/crm/CustomerDetailSheet';
import WhatsAppConnectDialog from '@/components/crm/WhatsAppConnectDialog';
import CrmDashboardKpis from '@/components/crm/CrmDashboardKpis';
import BirthdayTimeline from '@/components/crm/BirthdayTimeline';
import ReactivationPanel from '@/components/crm/ReactivationPanel';
import N8nSettingsPanel from '@/components/crm/N8nSettingsPanel';
import LeadsKanban from '@/components/crm/LeadsKanban';
import CustomerForm from '@/components/crm/CustomerForm';
import { Search, Users, Cake, AlertTriangle, Settings, ArrowUpDown, Columns3, MessageCircle, Plus } from 'lucide-react';

type SortKey = 'name' | 'total_spent' | 'last_purchase_at' | 'created_at';

const Crm = () => {
  const { loading, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [activeTab, setActiveTab] = useState('clientes');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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

  const tabs = [
    { value: 'clientes', label: 'Clientes', icon: Users },
    { value: 'pipeline', label: 'Pipeline', icon: Columns3 },
    { value: 'aniversarios', label: 'Aniversários', icon: Cake },
    { value: 'reativacao', label: 'Reativação', icon: AlertTriangle },
    { value: 'config', label: 'Config', icon: Settings },
  ];

  const statusFilters = [
    { key: 'todos', label: 'Todos', count: all.length },
    { key: 'ativo', label: 'Ativos', count: activeCount },
    { key: 'inativo', label: 'Inativos', count: inactiveCount },
    { key: 'novo', label: 'Novos', count: newCount },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-end justify-between opacity-0 animate-fade-in animate-stagger-1">
          <div>
            <h1 className="page-title-gradient">CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">Relacionamento e marketing inteligente</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Cliente
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              style={{ background: 'linear-gradient(135deg, hsl(152 60% 30%), hsl(152 50% 40%))' }}
              onClick={() => setWhatsappOpen(true)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <CrmDashboardKpis />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="flex gap-2 bg-transparent p-0 h-auto">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-500 gap-1.5 border-0 ${
                    activeTab === tab.value
                      ? 'text-white depth-shadow scale-105'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                  style={activeTab === tab.value ? {
                    background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
                  } : { background: 'hsl(var(--muted) / 0.5)' }}
                >
                  <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.value ? 'text-white' : ''}`} />{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ─── Clientes Tab ─── */}
          <TabsContent value="clientes" className="space-y-4">
            {/* Toolbar: filters + search */}
            <div className="card-cinematic rounded-xl p-4 space-y-4">
              {/* Status pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium uppercase tracking-wider mr-1" style={{ color: 'hsl(36 30% 85%)' }}>Filtro:</span>
                {statusFilters.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(s.key)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-400 ${
                      statusFilter === s.key
                        ? 'text-primary-foreground depth-shadow scale-105'
                        : 'hover:bg-muted/60'
                    }`}
                    style={statusFilter === s.key ? {
                      background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
                    } : { color: 'hsl(36 30% 75%)', background: 'hsl(var(--muted) / 0.4)' }}
                  >
                    {s.label} ({s.count})
                  </button>
                ))}
              </div>

              {/* Search + Sort */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone, e-mail ou Instagram..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 input-glow h-10"
                  />
                </div>
                <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
                  <SelectTrigger className="w-44 h-10">
                    <ArrowUpDown className="h-3 w-3 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="total_spent">Maior gasto</SelectItem>
                    <SelectItem value="last_purchase_at">Última compra</SelectItem>
                    <SelectItem value="created_at">Mais recente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="text-center py-16">
                <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground text-xs mt-3">Carregando clientes...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 card-cinematic rounded-xl">
                <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm font-medium">Nenhum cliente encontrado</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Cadastre seu primeiro cliente para começar</p>
                <Button
                  size="sm"
                  className="mt-4 gap-1.5"
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar Cliente
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map(c => <CustomerCard key={c.id} customer={c} onClick={() => openDetail(c)} />)}
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── Pipeline Tab ─── */}
          <TabsContent value="pipeline">
            <LeadsKanban />
          </TabsContent>

          {/* ─── Aniversários Tab ─── */}
          <TabsContent value="aniversarios">
            <BirthdayTimeline />
          </TabsContent>

          {/* ─── Reativação Tab ─── */}
          <TabsContent value="reativacao">
            <ReactivationPanel />
          </TabsContent>

          {/* ─── Config Tab ─── */}
          <TabsContent value="config">
            <N8nSettingsPanel />
          </TabsContent>
        </Tabs>

        <CustomerDetailSheet customer={selectedCustomer} open={sheetOpen} onOpenChange={setSheetOpen} />
        <WhatsAppConnectDialog open={whatsappOpen} onOpenChange={setWhatsappOpen} />
      </div>
    </AppLayout>
  );
};

export default Crm;
