import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Loader2, Phone, Cake } from 'lucide-react';
import { useTeamMembers, useUpdateRole } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import EmployeeSheet from '@/components/team/EmployeeSheet';
import NewEmployeeDialog from '@/components/team/NewEmployeeDialog';

const roleLabels: Record<string, string> = { owner: 'Proprietário', employee: 'Funcionário', client: 'Cliente' };
const avatarColors = [
  'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
  'linear-gradient(135deg, hsl(36 70% 50%), hsl(36 90% 65%))',
  'linear-gradient(135deg, hsl(142 60% 40%), hsl(142 60% 50%))',
  'linear-gradient(135deg, hsl(0 72% 51%), hsl(0 72% 40%))',
  'linear-gradient(135deg, hsl(38 92% 50%), hsl(38 92% 40%))',
];

const Team = () => {
  const { data: members, isLoading } = useTeamMembers();
  const { isOwner, user } = useAuth();
  const updateRole = useUpdateRole();
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate(
      { userId, newRole: newRole as any },
      { onSuccess: () => toast.success('Role atualizada!'), onError: () => toast.error('Erro ao atualizar role') }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Equipe</h1>
            <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">Gerenciar funcionários — {members?.length ?? 0} membros</p>
          </div>
          {isOwner && <NewEmployeeDialog />}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !members?.length ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhum membro na equipe.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m: any, i: number) => {
              const initials = (m.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const bgGradient = avatarColors[i % avatarColors.length];
              return (
                <div key={m.id} className="card-cinematic rounded-xl opacity-0 animate-fade-in group cursor-pointer" style={{ animationDelay: `${i * 80}ms` }} onClick={() => setSelectedMember(m)}>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          {m.photo_url && <AvatarImage src={m.photo_url} alt={m.name} />}
                          <AvatarFallback className="text-white font-bold" style={{ background: bgGradient }}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full animate-glow-pulse opacity-40" style={{ boxShadow: '0 0 12px hsl(36 70% 50% / 0.3)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate group-hover:text-accent transition-colors">{m.name}</p>
                        {m.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</p>}
                        {m.birthday && <p className="text-xs text-muted-foreground flex items-center gap-1"><Cake className="h-3 w-3" />{new Date(m.birthday).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {isOwner && m.user_id !== user?.id ? (
                        <Select value={m.roles?.[0] || 'employee'} onValueChange={(val) => handleRoleChange(m.user_id, val)}>
                          <SelectTrigger className="w-[130px] h-8 text-xs glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="owner">Proprietário</SelectItem>
                            <SelectItem value="employee">Funcionário</SelectItem>
                            <SelectItem value="client">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-1">
                          {m.roles?.map((r: string) => (
                            <Badge key={r} variant="secondary" className="text-xs"
                              style={{ background: 'linear-gradient(135deg, hsl(36 70% 50% / 0.1), hsl(24 60% 23% / 0.05))' }}>
                              {roleLabels[r] ?? r}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <EmployeeSheet
          member={selectedMember}
          open={!!selectedMember}
          onOpenChange={(open) => { if (!open) setSelectedMember(null); }}
        />
      </div>
    </AppLayout>
  );
};

export default Team;
