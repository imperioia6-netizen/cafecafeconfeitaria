import { useState } from 'react';
import { useSocialLeads, type SocialLead, type LeadStatus } from '@/hooks/useSocialLeads';
import { useCustomers } from '@/hooks/useCustomers';
import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, ChevronRight, ChevronLeft, Phone, Instagram, StickyNote,
  DollarSign, Clock, UserPlus, Trash2,
} from 'lucide-react';

const COLUMNS: { status: LeadStatus; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { status: 'novo_lead', label: 'Novo Lead', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  { status: 'em_negociacao', label: 'Em Negociação', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { status: 'proposta_aceita', label: 'Proposta Aceita', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { status: 'convertido', label: 'Convertido', color: 'text-accent', bgColor: 'bg-accent/10', borderColor: 'border-accent/20' },
];

const LeadsKanban = () => {
  const { data: leads, createLead, updateLead, deleteLead } = useSocialLeads();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SocialLead | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', instagram_handle: '', potential_value: '', notes: '' });

  const kanbanLeads = (leads || []).filter(l =>
    ['novo_lead', 'em_negociacao', 'proposta_aceita', 'convertido'].includes(l.status)
  );

  const getColumnLeads = (status: LeadStatus) =>
    kanbanLeads.filter(l => l.status === status).sort((a, b) => (b.potential_value || 0) - (a.potential_value || 0));

  const getColumnTotal = (status: LeadStatus) =>
    getColumnLeads(status).reduce((s, l) => s + (l.potential_value || 0), 0);

  const getDaysInStage = (lead: SocialLead) => {
    const ref = lead.stage_changed_at || lead.created_at;
    return differenceInDays(new Date(), parseISO(ref));
  };

  const openCreate = () => {
    setEditingLead(null);
    setForm({ name: '', phone: '', instagram_handle: '', potential_value: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (lead: SocialLead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      phone: lead.phone || '',
      instagram_handle: lead.instagram_handle || '',
      potential_value: String(lead.potential_value || ''),
      notes: lead.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name && !form.instagram_handle) {
      toast({ title: 'Preencha nome ou Instagram', variant: 'destructive' });
      return;
    }

    if (editingLead) {
      updateLead.mutate({
        id: editingLead.id,
        name: form.name || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        potential_value: form.potential_value ? Number(form.potential_value) : undefined,
      });
    } else {
      createLead.mutate({
        instagram_handle: form.instagram_handle || form.name || '-',
        name: form.name || undefined,
        phone: form.phone || undefined,
        potential_value: form.potential_value ? Number(form.potential_value) : 0,
        notes: form.notes || undefined,
        status: 'novo_lead',
      });
    }
    setDialogOpen(false);
  };

  const moveLead = (lead: SocialLead, direction: 'forward' | 'back') => {
    const currentIndex = COLUMNS.findIndex(c => c.status === lead.status);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;

    updateLead.mutate({
      id: lead.id,
      status: COLUMNS[nextIndex].status,
      stage_changed_at: new Date().toISOString(),
      ...(COLUMNS[nextIndex].status === 'convertido' ? { converted_at: new Date().toISOString() } : {}),
    });

    if (COLUMNS[nextIndex].status === 'convertido') {
      toast({ title: '🎉 Lead convertido!', description: 'Você pode transformá-lo em cliente.' });
    }
  };

  const handleDelete = (id: string) => {
    deleteLead.mutate(id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Pipeline de Leads
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {kanbanLeads.length} leads · R$ {getColumnTotal('novo_lead' as LeadStatus) + getColumnTotal('em_negociacao' as LeadStatus) + getColumnTotal('proposta_aceita' as LeadStatus) + getColumnTotal('convertido' as LeadStatus)} potencial
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Novo Lead
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
        {COLUMNS.map((col, colIdx) => {
          const colLeads = getColumnLeads(col.status);
          const colTotal = getColumnTotal(col.status);

          return (
            <div
              key={col.status}
              className={`flex-shrink-0 w-72 rounded-xl border ${col.borderColor} bg-card/40 backdrop-blur-sm opacity-0 animate-fade-in animate-stagger-${colIdx + 1}`}
            >
              {/* Column Header */}
              <div className={`p-3 border-b ${col.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.bgColor} ${col.color}`} style={{ boxShadow: `0 0 8px currentColor` }} />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono-numbers">{colLeads.length}</Badge>
                </div>
                {colTotal > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono-numbers">
                    R$ {colTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </p>
                )}
              </div>

              {/* Column Cards */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
                {colLeads.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground/50">Nenhum lead</p>
                  </div>
                )}
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="card-cinematic rounded-lg p-3 space-y-2 cursor-pointer hover:border-border/60 transition-all"
                    onClick={() => openEdit(lead)}
                  >
                    {/* Lead Name & Value */}
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-semibold truncate flex-1">
                        {lead.name || lead.instagram_handle}
                      </p>
                      {(lead.potential_value || 0) > 0 && (
                        <span className="text-xs font-mono-numbers text-accent font-bold ml-2 flex items-center gap-0.5">
                          <DollarSign className="h-3 w-3" />
                          {lead.potential_value?.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                      {lead.phone && (
                        <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{lead.phone}</span>
                      )}
                      {lead.instagram_handle && lead.instagram_handle !== '-' && (
                        <span className="flex items-center gap-0.5"><Instagram className="h-2.5 w-2.5" />@{lead.instagram_handle}</span>
                      )}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{getDaysInStage(lead)}d</span>
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                      <p className="text-[10px] text-muted-foreground/70 line-clamp-2 flex items-start gap-1">
                        <StickyNote className="h-2.5 w-2.5 mt-0.5 shrink-0" />{lead.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1" onClick={e => e.stopPropagation()}>
                      {colIdx > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveLead(lead, 'back')}>
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                      )}
                      {colIdx < COLUMNS.length - 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveLead(lead, 'forward')}>
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(lead.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              {editingLead ? 'Editar Lead' : 'Novo Lead'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do lead" className="input-glow" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className="input-glow" />
            </div>
            <div>
              <Label className="text-xs">Instagram</Label>
              <Input value={form.instagram_handle} onChange={e => setForm(p => ({ ...p, instagram_handle: e.target.value }))} placeholder="@usuario" className="input-glow" />
            </div>
            <div>
              <Label className="text-xs">Valor Potencial (R$)</Label>
              <Input type="number" value={form.potential_value} onChange={e => setForm(p => ({ ...p, potential_value: e.target.value }))} placeholder="0" className="input-glow" />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações..." rows={3} />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={createLead.isPending || updateLead.isPending}>
              {editingLead ? 'Salvar' : 'Criar Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsKanban;
