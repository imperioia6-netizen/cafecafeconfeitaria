import { useState } from 'react';
import { useSocialLeads, type SocialLead, type LeadStatus, type LeadSource, type LeadPriority } from '@/hooks/useSocialLeads';
import { differenceInDays, parseISO, format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Plus, ChevronRight, ChevronLeft, Phone, Instagram, StickyNote,
  DollarSign, Clock, Trash2, Mail, Globe, MessageCircle, Users,
  CalendarIcon, ShoppingBag, AlertTriangle,
} from 'lucide-react';

const COLUMNS: { status: LeadStatus; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { status: 'novo_lead', label: 'Novo Lead', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  { status: 'em_negociacao', label: 'Em Negociação', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { status: 'proposta_aceita', label: 'Proposta Aceita', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { status: 'convertido', label: 'Convertido', color: 'text-accent', bgColor: 'bg-accent/10', borderColor: 'border-accent/20' },
];

const SOURCE_OPTIONS: { value: LeadSource; label: string; icon: typeof Instagram }[] = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'indicacao', label: 'Indicação', icon: Users },
  { value: 'site', label: 'Site', icon: Globe },
  { value: 'outro', label: 'Outro', icon: Globe },
];

const PRIORITY_CONFIG: Record<LeadPriority, { label: string; className: string }> = {
  alta: { label: 'Alta', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  media: { label: 'Média', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  baixa: { label: 'Baixa', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

type FormState = {
  name: string; phone: string; instagram_handle: string; potential_value: string;
  notes: string; email: string; source: LeadSource; priority: LeadPriority;
  follow_up_date: Date | undefined; product_interest: string;
};

const emptyForm: FormState = {
  name: '', phone: '', instagram_handle: '', potential_value: '', notes: '',
  email: '', source: 'outro', priority: 'media', follow_up_date: undefined, product_interest: '',
};

const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

const FollowUpIndicator = ({ date }: { date: string | null }) => {
  if (!date) return null;
  const d = parseISO(date);
  if (isToday(d)) return <span className="text-amber-400 font-semibold text-[10px]">Hoje</span>;
  if (isPast(d)) return <span className="text-red-400 font-semibold text-[10px] flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Atrasado</span>;
  return <span className="text-muted-foreground text-[10px]">{format(d, 'dd/MM', { locale: ptBR })}</span>;
};

const SourceIcon = ({ source }: { source: LeadSource }) => {
  const opt = SOURCE_OPTIONS.find(s => s.value === source);
  if (!opt) return null;
  const Icon = opt.icon;
  return <Icon className="h-2.5 w-2.5" />;
};

const LeadsKanban = () => {
  const { data: leads, isError, createLead, updateLead, deleteLead } = useSocialLeads();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SocialLead | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    setForm(emptyForm);
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
      email: lead.email || '',
      source: (lead.source as LeadSource) || 'outro',
      priority: (lead.priority as LeadPriority) || 'media',
      follow_up_date: lead.follow_up_date ? parseISO(lead.follow_up_date) : undefined,
      product_interest: lead.product_interest || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name && !form.instagram_handle) {
      toast({ title: 'Preencha nome ou Instagram', variant: 'destructive' });
      return;
    }

    const payload = {
      name: form.name || undefined,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
      potential_value: form.potential_value ? Number(form.potential_value) : undefined,
      email: form.email || undefined,
      source: form.source,
      priority: form.priority,
      follow_up_date: form.follow_up_date ? format(form.follow_up_date, 'yyyy-MM-dd') : null,
      product_interest: form.product_interest || undefined,
    };

    if (editingLead) {
      updateLead.mutate({ id: editingLead.id, ...payload });
    } else {
      createLead.mutate({
        instagram_handle: form.instagram_handle || form.name || '-',
        ...payload,
        potential_value: payload.potential_value || 0,
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
    setConfirmDelete(null);
    setDialogOpen(false);
  };

  const totalPipeline = COLUMNS.reduce((s, c) => s + getColumnTotal(c.status), 0);

  if (isError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-10 w-10 text-destructive/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Erro ao carregar pipeline</p>
        <p className="text-xs text-muted-foreground mt-1">Tente recarregar a página</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Pipeline de Leads
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {kanbanLeads.length} leads · R$ {totalPipeline.toLocaleString('pt-BR')} potencial
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
              className={`flex-shrink-0 w-72 rounded-xl border ${col.borderColor} bg-card/40 backdrop-blur-sm`}
            >
              {/* Column Header */}
              <div className={`p-3 border-b ${col.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.bgColor} ${col.color}`} style={{ boxShadow: '0 0 8px currentColor' }} />
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
                {colLeads.map(lead => {
                  const priority = (lead.priority as LeadPriority) || 'media';
                  const source = (lead.source as LeadSource) || 'outro';

                  return (
                    <div
                      key={lead.id}
                      className="card-cinematic rounded-lg p-3 space-y-2 cursor-pointer hover:border-border/60 transition-all"
                      onClick={() => openEdit(lead)}
                    >
                      {/* Top row: Avatar + Name + Priority */}
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getInitials(lead.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{lead.name || lead.instagram_handle}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border', PRIORITY_CONFIG[priority].className)}>
                              {PRIORITY_CONFIG[priority].label}
                            </Badge>
                            {(lead.potential_value || 0) > 0 && (
                              <span className="text-[10px] font-mono-numbers text-accent font-bold flex items-center gap-0.5">
                                <DollarSign className="h-2.5 w-2.5" />
                                {lead.potential_value?.toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><SourceIcon source={source} />{SOURCE_OPTIONS.find(s => s.value === source)?.label}</span>
                        {lead.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{lead.phone}</span>}
                        {lead.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{lead.email}</span>}
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{getDaysInStage(lead)}d</span>
                      </div>

                      {/* Follow-up & Product */}
                      <div className="flex items-center gap-2">
                        {lead.follow_up_date && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-2.5 w-2.5 text-muted-foreground" />
                            <FollowUpIndicator date={lead.follow_up_date} />
                          </div>
                        )}
                        {lead.product_interest && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted/50">
                            <ShoppingBag className="h-2 w-2 mr-0.5" />{lead.product_interest}
                          </Badge>
                        )}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => setConfirmDelete(lead.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="glass-strong rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong rounded-xl max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {editingLead ? 'Editar Lead' : 'Novo Lead'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Section: Dados de Contato */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados de Contato</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do lead" className="input-glow" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" className="input-glow" />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className="input-glow" />
                </div>
                <div>
                  <Label className="text-xs">Instagram</Label>
                  <Input value={form.instagram_handle} onChange={e => setForm(p => ({ ...p, instagram_handle: e.target.value }))} placeholder="@usuario" className="input-glow" />
                </div>
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Section: Detalhes do Negócio */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detalhes do Negócio</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Origem</Label>
                  <Select value={form.source} onValueChange={(v: LeadSource) => setForm(p => ({ ...p, source: v }))}>
                    <SelectTrigger className="input-glow">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v: LeadPriority) => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger className="input-glow">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-400" /> Alta</span></SelectItem>
                      <SelectItem value="media"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> Média</span></SelectItem>
                      <SelectItem value="baixa"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Baixa</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor Potencial (R$)</Label>
                  <Input type="number" value={form.potential_value} onChange={e => setForm(p => ({ ...p, potential_value: e.target.value }))} placeholder="0" className="input-glow" />
                </div>
                <div>
                  <Label className="text-xs">Follow-up</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal input-glow", !form.follow_up_date && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                        {form.follow_up_date ? format(form.follow_up_date, 'dd/MM/yyyy') : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.follow_up_date}
                        onSelect={(d) => setForm(p => ({ ...p, follow_up_date: d }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs">Produto de Interesse</Label>
                <Input value={form.product_interest} onChange={e => setForm(p => ({ ...p, product_interest: e.target.value }))} placeholder="Ex: Bolo de chocolate, Kit festa..." className="input-glow" />
              </div>
              <div className="mt-3">
                <Label className="text-xs">Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações..." rows={3} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {editingLead && (
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(editingLead.id)} className="mr-auto">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
              )}
              <div className="flex-1" />
              <Button onClick={handleSave} disabled={createLead.isPending || updateLead.isPending}>
                {editingLead ? 'Salvar' : 'Criar Lead'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsKanban;
