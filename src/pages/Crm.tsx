import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers } from '@/hooks/useCustomers';
import CustomerCard from '@/components/crm/CustomerCard';
import CustomerForm from '@/components/crm/CustomerForm';
import BirthdayTimeline from '@/components/crm/BirthdayTimeline';
import ReactivationPanel from '@/components/crm/ReactivationPanel';
import SocialFunnel from '@/components/crm/SocialFunnel';
import N8nSettingsPanel from '@/components/crm/N8nSettingsPanel';
import { Search, Users, Cake, AlertTriangle, Instagram, Settings } from 'lucide-react';

const Crm = () => {
  const { loading, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const { data: customers, isLoading } = useCustomers(statusFilter);

  if (!loading && !user) { navigate('/auth'); return null; }
  if (!loading && !isOwner) { navigate('/'); return null; }

  const filtered = (customers || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.instagram_handle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title-gradient">CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">Relacionamento e marketing inteligente</p>
          </div>
        </div>

        <Tabs defaultValue="clientes" className="space-y-4">
          <TabsList className="glass-card border-border/30 p-1">
            <TabsTrigger value="clientes" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Users className="h-3.5 w-3.5" />Clientes
            </TabsTrigger>
            <TabsTrigger value="aniversarios" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Cake className="h-3.5 w-3.5" />Aniversários
            </TabsTrigger>
            <TabsTrigger value="reativacao" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />Reativação
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Instagram className="h-3.5 w-3.5" />Social Seller
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent gap-1.5">
              <Settings className="h-3.5 w-3.5" />Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="space-y-4">
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                  <SelectItem value="novo">Novos</SelectItem>
                </SelectContent>
              </Select>
              <CustomerForm />
            </div>

            {isLoading ? (
              <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum cliente encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(c => <CustomerCard key={c.id} customer={c} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aniversarios">
            <BirthdayTimeline />
          </TabsContent>

          <TabsContent value="reativacao">
            <ReactivationPanel />
          </TabsContent>

          <TabsContent value="social">
            <SocialFunnel />
          </TabsContent>

          <TabsContent value="config">
            <N8nSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Crm;
