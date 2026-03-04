import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Alert = Tables<'alerts'>;

export function useActiveAlerts() {
  return useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, recipes(name)')
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action_taken }: { id: string; action_taken: string }) => {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString(), action_taken })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useAlertCount() {
  return useQuery({
    queryKey: ['alerts', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });
}
