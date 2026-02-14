import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Star, TrendingUp, DollarSign, BarChart3, Receipt, Loader2 } from 'lucide-react';
import { useEmployeeStats, useUpdateServiceRating } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = { owner: 'Proprietário', employee: 'Funcionário', client: 'Cliente' };

interface EmployeeSheetProps {
  member: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmployeeSheet({ member, open, onOpenChange }: EmployeeSheetProps) {
  const { isOwner } = useAuth();
  const { data: stats, isLoading: statsLoading } = useEmployeeStats(member?.user_id);
  const updateRating = useUpdateServiceRating();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (member) {
      setRating(member.service_rating ?? 0);
      setNotes(member.service_notes ?? '');
    }
  }, [member]);

  if (!member) return null;

  const initials = (member.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSave = () => {
    updateRating.mutate(
      { id: member.id, service_rating: rating, service_notes: notes },
      {
        onSuccess: () => toast.success('Avaliação salva!'),
        onError: () => toast.error('Erro ao salvar avaliação'),
      }
    );
  };

  const engagementPercent = stats ? Math.min((stats.totalSales / 200) * 100, 100) : 0;

  const kpis = [
    { label: 'Total de Vendas', value: stats?.totalSales ?? 0, icon: Receipt, format: (v: number) => v.toString() },
    { label: 'Faturamento', value: stats?.totalRevenue ?? 0, icon: DollarSign, format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
    { label: 'Média/Dia', value: stats?.avgPerDay ?? 0, icon: TrendingUp, format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
    { label: 'Ticket Médio', value: stats?.avgTicket ?? 0, icon: BarChart3, format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto glass-card border-border/30">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Ficha do Funcionário</SheetTitle>
          <SheetDescription className="sr-only">Detalhes e desempenho do funcionário</SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback
              className="text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{member.name}</h2>
            <div className="flex gap-1 mt-1">
              {member.roles?.map((r: string) => (
                <Badge key={r} variant="secondary" className="text-xs">
                  {roleLabels[r] ?? r}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {member.phone && <p>📞 {member.phone}</p>}
              {member.birthday && <p>🎂 {new Date(member.birthday).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>}
            </div>
          </div>
        </div>

        {/* Sales KPIs */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Desempenho de Vendas</h3>
          {statsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {kpis.map(kpi => (
                  <div key={kpi.label} className="card-cinematic rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <kpi.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px]">{kpi.label}</span>
                    </div>
                    <p className="text-base font-bold">{kpi.format(kpi.value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Engajamento</span>
                  <span>{Math.round(engagementPercent)}%</span>
                </div>
                <Progress value={engagementPercent} className="h-2" />
              </div>
            </>
          )}
        </div>

        {/* Service Rating */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Nota de Atendimento</h3>
          <div className="card-cinematic rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => {
                  const filled = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      disabled={!isOwner}
                      className="transition-transform hover:scale-110 disabled:cursor-default"
                      onClick={() => isOwner && setRating(star)}
                      onMouseEnter={() => isOwner && setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {rating > 0 ? `${rating}.0 / 5.0` : '—'}
              </span>
            </div>

            {isOwner && (
              <>
                <Textarea
                  placeholder="Observação sobre o atendimento..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="glass text-sm min-h-[60px]"
                />
                <Button
                  onClick={handleSave}
                  disabled={updateRating.isPending}
                  className="w-full"
                  size="sm"
                >
                  {updateRating.isPending ? 'Salvando...' : 'Salvar Avaliação'}
                </Button>
              </>
            )}

            {!isOwner && notes && (
              <p className="text-sm text-muted-foreground italic">"{notes}"</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
