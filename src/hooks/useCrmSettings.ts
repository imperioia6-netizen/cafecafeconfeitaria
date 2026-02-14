import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CrmSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export function useCrmSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['crm_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_settings').select('*');
      if (error) throw error;
      return data as CrmSetting[];
    },
  });

  const getSetting = (key: string) => query.data?.find(s => s.key === key)?.value;

  const upsertSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existing = query.data?.find(s => s.key === key);
      if (existing) {
        const { error } = await supabase.from('crm_settings').update({ value } as any).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_settings').insert({ key, value } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_settings'] });
      toast({ title: 'Configuração salva!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...query, getSetting, upsertSetting };
}
