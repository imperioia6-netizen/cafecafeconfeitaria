import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2 } from 'lucide-react';
import { useTeamMembers, useUpdateRole } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  employee: 'Funcionário',
  client: 'Cliente',
};

const Team = () => {
  const { data: members, isLoading } = useTeamMembers();
  const { isOwner, user } = useAuth();
  const updateRole = useUpdateRole();

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate(
      { userId, newRole: newRole as any },
      {
        onSuccess: () => toast.success('Role atualizada!'),
        onError: () => toast.error('Erro ao atualizar role'),
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerenciar funcionários e permissões</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Funcionários ({members?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !members?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro na equipe.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Aniversário</TableHead>
                    <TableHead>Papel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.phone ?? '—'}</TableCell>
                      <TableCell>{m.birthday ? new Date(m.birthday).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell>
                        {isOwner && m.user_id !== user?.id ? (
                          <Select
                            value={m.roles?.[0] || 'employee'}
                            onValueChange={(val) => handleRoleChange(m.user_id, val)}
                          >
                            <SelectTrigger className="w-[140px]">
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
                              <Badge key={r} variant="secondary">{roleLabels[r] ?? r}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Team;
