import { useState } from 'react';
import { useSocialLeads } from '@/hooks/useSocialLeads';
import { useCrmN8n } from '@/hooks/useCrmN8n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Plus, Users, MessageSquare, ShoppingCart, UserCheck, ChevronRight, TrendingUp } from 'lucide-react';

const statusConfig = {
  novo_seguidor: { label: 'Novo Seguidor', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', barColor: 'bg-blue-400' },
  mensagem_enviada: { label: 'Msg Enviada', icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10', barColor: 'bg-amber-400' },
  convertido: { label: 'Convertido', icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', barColor: 'bg-emerald-400' },
  cliente: { label: 'Cliente', icon: UserCheck, color: 'text-accent', bg: 'bg-accent/10', barColor: 'bg-accent' },
};

const statusOrder = ['novo_seguidor', 'mensagem_enviada', 'convertido', 'cliente'] as const;

const SocialFunnel = () => {
  const { data: leads, createLead, updateLead } = useSocialLeads();
  const { trigger } = useCrmN8n();
  const [newHandle, setNewHandle] = useState('');
  const [newFollowers, setNewFollowers] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  const handleAdd = () => {
    if (!newHandle) return;
    createLead.mutate({ instagram_handle: newHandle, followers_count: Number(newFollowers) || 0 });
    setNewHandle('');
    setNewFollowers('');
  };

  const handleSendOffer = (lead: any) => {
    trigger.mutate({
      action_type: 'social_seller',
      customer_data: { instagram_handle: lead.instagram_handle, followers_count: lead.followers_count, lead_id: lead.id },
    });
    updateLead.mutate({ id: lead.id, status: 'mensagem_enviada' as any });
  };

  const advanceStatus = (lead: any) => {
    const currentIdx = statusOrder.indexOf(lead.status);
    if (currentIdx < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIdx + 1];
      updateLead.mutate({
        id: lead.id,
        status: nextStatus as any,
        ...(nextStatus === 'convertido' ? { converted_at: new Date().toISOString() } : {}),
      });
    }
  };

  // Stats
  const allLeads = leads || [];
  const stats = statusOrder.map(s => ({
    status: s,
    ...statusConfig[s],
    count: allLeads.filter(l => l.status === s).length,
  }));
  const maxCount = Math.max(...stats.map(s => s.count), 1);

  // Conversion rates
  const convRates = statusOrder.slice(0, -1).map((s, i) => {
    const from = stats[i].count;
    const to = stats[i + 1].count;
    return from > 0 ? Math.round((to / from) * 100) : 0;
  });

  // Filter leads
  const filteredLeads = filterStatus === 'todos' ? allLeads : allLeads.filter(l => l.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Visual Funnel */}
      <div className="card-cinematic rounded-xl p-6">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          Funil de Conversão
        </h4>
        <div className="space-y-3">
          {stats.map((s, i) => (
            <div key={s.status}>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="font-mono-numbers text-sm font-bold text-foreground">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.barColor} transition-all duration-700`}
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              {i < stats.length - 1 && convRates[i] > 0 && (
                <div className="ml-4 pl-7 py-1">
                  <span className="text-[9px] text-muted-foreground font-mono-numbers">↓ {convRates[i]}% conversão</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add lead */}
      <div className="flex gap-2">
        <Input placeholder="@instagram" value={newHandle} onChange={e => setNewHandle(e.target.value)} className="input-glow flex-1" />
        <Input placeholder="Seguidores" type="number" value={newFollowers} onChange={e => setNewFollowers(e.target.value)} className="input-glow w-28" />
        <Button onClick={handleAdd} disabled={createLead.isPending} className="bg-accent text-accent-foreground"><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtrar:</span>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({allLeads.length})</SelectItem>
            {statusOrder.map(s => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum lead encontrado</p>
          </div>
        ) : (
          filteredLeads.map(lead => {
            const cfg = statusConfig[lead.status] || statusConfig.novo_seguidor;
            const canAdvance = statusOrder.indexOf(lead.status) < statusOrder.length - 1;
            return (
              <div key={lead.id} className="card-cinematic rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`h-8 w-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{lead.instagram_handle}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono-numbers">{lead.followers_count} seg.</span>
                      <Badge variant="outline" className={`text-[9px] border-0 ${cfg.color} ${cfg.bg}`}>{cfg.label}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {lead.status === 'novo_seguidor' && (
                    <Button size="sm" variant="outline" onClick={() => handleSendOffer(lead)} disabled={trigger.isPending} className="border-accent/30 text-accent hover:bg-accent/10 h-8 text-xs">
                      <Send className="h-3 w-3 mr-1" />n8n
                    </Button>
                  )}
                  {canAdvance && (
                    <Button size="sm" variant="ghost" onClick={() => advanceStatus(lead)} className="h-8 text-xs text-muted-foreground hover:text-accent">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SocialFunnel;
