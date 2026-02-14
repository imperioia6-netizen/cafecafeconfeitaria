import { useState } from 'react';
import { type Customer } from '@/hooks/useCustomers';
import { useCustomers } from '@/hooks/useCustomers';
import { useCrmMessages } from '@/hooks/useCrmMessages';
import { useCrmN8n } from '@/hooks/useCrmN8n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Phone, Mail, Instagram, Cake, Send, Edit2, Trash2, MessageSquare, DollarSign } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CustomerForm from './CustomerForm';

interface Props {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getInitials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-500',
  inativo: 'bg-red-500',
  novo: 'bg-blue-500',
};

const CustomerDetailSheet = ({ customer, open, onOpenChange }: Props) => {
  const { deleteCustomer } = useCustomers();
  const { data: messages } = useCrmMessages(customer?.id);
  const { trigger } = useCrmN8n();
  const [editing, setEditing] = useState(false);

  if (!customer) return null;

  const daysSince = customer.last_purchase_at
    ? differenceInDays(new Date(), parseISO(customer.last_purchase_at))
    : null;

  // Engagement score (simple heuristic: based on total_spent and recency)
  const spentScore = Math.min(Number(customer.total_spent || 0) / 500, 1) * 50;
  const recencyScore = daysSince !== null ? Math.max(0, 50 - daysSince) : 0;
  const engagement = Math.round(spentScore + recencyScore);

  const customerMessages = messages || [];

  const handleDelete = async () => {
    await deleteCustomer.mutateAsync(customer.id);
    onOpenChange(false);
  };

  const handleSendReactivation = () => {
    trigger.mutate({
      action_type: 'reativacao',
      customer_data: {
        customer_id: customer.id,
        customer_name: customer.name,
        days_inactive: daysSince,
        total_spent: customer.total_spent,
        phone: customer.phone,
      },
    });
  };

  if (editing) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="glass-card border-border/30 w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Editar Cliente</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CustomerForm customer={customer} onSuccess={() => setEditing(false)} mode="edit" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass-card border-border/30 w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-0">
          <div className="flex items-start gap-4 mt-2">
            <div className={`h-14 w-14 rounded-full ${statusColors[customer.status] || 'bg-muted'} flex items-center justify-center text-white font-bold text-lg shrink-0`} style={{ fontFamily: "'Playfair Display', serif" }}>
              {getInitials(customer.name)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-foreground text-lg truncate">{customer.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] capitalize">{customer.status}</Badge>
                {daysSince !== null && (
                  <span className="text-[10px] text-muted-foreground">{daysSince}d sem comprar</span>
                )}
              </div>
            </div>
            <span className="font-mono-numbers text-lg font-bold text-accent shrink-0">
              R$ {Number(customer.total_spent).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </SheetHeader>

        {/* Engagement Bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Engajamento</span>
            <span className="font-mono-numbers">{engagement}%</span>
          </div>
          <Progress value={engagement} className="h-1.5" />
        </div>

        {/* Contact Info */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {customer.phone && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.instagram_handle && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <Instagram className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{customer.instagram_handle}</span>
              {customer.instagram_followers > 0 && (
                <Badge variant="secondary" className="text-[9px] ml-auto">{customer.instagram_followers} seg.</Badge>
              )}
            </div>
          )}
          {customer.birthday && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <Cake className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{format(parseISO(customer.birthday), "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {customer.preferred_channel && (
            <Badge variant="outline" className="text-[9px]">📍 {customer.preferred_channel}</Badge>
          )}
          {customer.instagram_followers >= 5000 && (
            <Badge variant="outline" className="text-[9px] bg-accent/10 text-accent border-accent/30">⭐ Influenciador</Badge>
          )}
          {customer.family_name && (
            <Badge variant="outline" className="text-[9px]">👨‍👩‍👧 {customer.family_name}</Badge>
          )}
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="flex-1 gap-1 border-border/30">
            <Edit2 className="h-3 w-3" />Editar
          </Button>
          <Button size="sm" variant="outline" onClick={handleSendReactivation} disabled={trigger.isPending} className="flex-1 gap-1 border-accent/30 text-accent hover:bg-accent/10">
            <Send className="h-3 w-3" />Enviar via n8n
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-border/30">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita. O cliente será removido permanentemente.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator className="my-4" />

        {/* Messages History */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-accent" />
            Mensagens CRM
          </h4>
          {customerMessages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">Nenhuma mensagem enviada.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customerMessages.slice(0, 10).map(msg => (
                <div key={msg.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[9px] capitalize">{msg.message_type.replace(/_/g, ' ')}</Badge>
                    <Badge variant={msg.status === 'enviada' ? 'default' : 'outline'} className="text-[9px]">{msg.status}</Badge>
                  </div>
                  {msg.message_content && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{msg.message_content}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1 font-mono-numbers">
                    {format(parseISO(msg.created_at), "dd/MM/yy HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CustomerDetailSheet;
