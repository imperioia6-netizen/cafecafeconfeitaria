import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;
type AppRole = Database['public']['Enums']['app_role'];

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('*');
      if (rErr) throw rErr;

      return (profiles ?? []).map(p => ({
        ...p,
        roles: (roles ?? []).filter(r => r.user_id === p.user_id).map(r => r.role),
      }));
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'profiles'> & { id: string }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error: delErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });
      if (insErr) throw insErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useEmployeeStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total, sold_at')
        .eq('operator_id', userId!);
      if (error) throw error;
      const sales = data ?? [];
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((s, r) => s + Number(r.total), 0);
      const uniqueDays = new Set(sales.map(s => s.sold_at.slice(0, 10))).size;
      const avgPerDay = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
      return { totalSales, totalRevenue, avgPerDay, avgTicket };
    },
  });
}

export function useUpdateServiceRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, service_rating, service_notes }: { id: string; service_rating: number; service_notes: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ service_rating, service_notes } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
