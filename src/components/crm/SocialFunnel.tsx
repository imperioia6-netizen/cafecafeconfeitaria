import { useState } from 'react';
import { useSocialLeads } from '@/hooks/useSocialLeads';
import { useCrmN8n } from '@/hooks/useCrmN8n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Plus, Users, MessageSquare, ShoppingCart, UserCheck } from 'lucide-react';

const statusConfig = {
  novo_seguidor: { label: 'Novo', icon: Users, color: 'bg-blue-500/20 text-blue-400' },
  mensagem_enviada: { label: 'Msg Enviada', icon: MessageSquare, color: 'bg-amber-500/20 text-amber-400' },
  convertido: { label: 'Convertido', icon: ShoppingCart, color: 'bg-emerald-500/20 text-emerald-400' },
  cliente: { label: 'Cliente', icon: UserCheck, color: 'bg-accent/20 text-accent' },
};

const SocialFunnel = () => {
  const { data: leads, createLead, updateLead } = useSocialLeads();
  const { trigger } = useCrmN8n();
  const [newHandle, setNewHandle] = useState('');
  const [newFollowers, setNewFollowers] = useState('');

  const handleAdd = () => {
    if (!newHandle) return;
    createLead.mutate({ instagram_handle: newHandle, followers_count: Number(newFollowers) || 0 });
    setNewHandle('');
    setNewFollowers('');
  };

  const handleSendOffer = (lead: any) => {
    trigger.mutate({
      action_type: 'social_seller',
      customer_data: {
        instagram_handle: lead.instagram_handle,
        followers_count: lead.followers_count,
        lead_id: lead.id,
      },
    });
    updateLead.mutate({ id: lead.id, status: 'mensagem_enviada' as any });
  };

  // Funnel stats
  const stats = Object.keys(statusConfig).map(s => ({
    status: s,
    ...(statusConfig as any)[s],
    count: (leads || []).filter(l => l.status === s).length,
  }));

  return (
    <div className="space-y-6">
      {/* Funnel visual */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.status} className="card-cinematic rounded-xl p-4 text-center">
            <s.icon className="h-5 w-5 mx-auto mb-2 text-accent" />
            <p className="font-mono-numbers text-2xl font-bold text-foreground">{s.count}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add lead */}
      <div className="flex gap-2">
        <Input placeholder="@instagram" value={newHandle} onChange={e => setNewHandle(e.target.value)} className="input-glow flex-1" />
        <Input placeholder="Seguidores" type="number" value={newFollowers} onChange={e => setNewFollowers(e.target.value)} className="input-glow w-28" />
        <Button onClick={handleAdd} disabled={createLead.isPending} className="bg-accent text-accent-foreground"><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {(leads || []).map(lead => {
          const cfg = statusConfig[lead.status] || statusConfig.novo_seguidor;
          return (
            <div key={lead.id} className="card-cinematic rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{lead.instagram_handle}</span>
                <span className="text-[10px] text-muted-foreground">{lead.followers_count} seg.</span>
                <Badge variant="outline" className={`text-[10px] border-0 ${cfg.color}`}>{cfg.label}</Badge>
              </div>
              {lead.status === 'novo_seguidor' && (
                <Button size="sm" variant="outline" onClick={() => handleSendOffer(lead)} disabled={trigger.isPending} className="border-accent/30 text-accent hover:bg-accent/10">
                  <Send className="h-3 w-3 mr-1" />Enviar via n8n
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialFunnel;
