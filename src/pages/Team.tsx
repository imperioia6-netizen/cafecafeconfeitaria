import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Loader2 } from 'lucide-react';
import { useTeamMembers, useUpdateRole } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = { owner: 'Proprietário', employee: 'Funcionário', client: 'Cliente' };
const avatarColors = ['bg-primary', 'bg-accent', 'bg-success', 'bg-destructive', 'bg-warning'];

const Team = () => {
  const { data: members, isLoading } = useTeamMembers();
  const { isOwner, user } = useAuth();
  const updateRole = useUpdateRole();

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate(
      { userId, newRole: newRole as any },
      { onSuccess: () => toast.success('Role atualizada!'), onError: () => toast.error('Erro ao atualizar role') }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerenciar funcionários — {members?.length ?? 0} membros</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !members?.length ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum membro na equipe.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m: any, i: number) => {
              const initials = (m.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const colorClass = avatarColors[i % avatarColors.length];
              return (
                <Card key={m.id} className={`card-premium opacity-0 animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
                  <CardContent className="pt-6 pb-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`${colorClass} text-white font-bold`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.phone ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {m.birthday ? `🎂 ${new Date(m.birthday).toLocaleDateString('pt-BR')}` : ''}
                      </div>
                      {isOwner && m.user_id !== user?.id ? (
                        <Select value={m.roles?.[0] || 'employee'} onValueChange={(val) => handleRoleChange(m.user_id, val)}>
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Proprietário</SelectItem>
                            <SelectItem value="employee">Funcionário</SelectItem>
                            <SelectItem value="client">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-1">
                          {m.roles?.map((r: string) => (
                            <Badge key={r} variant="secondary" className="text-xs">{roleLabels[r] ?? r}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Team;
