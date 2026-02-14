import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CrmMessage {
  id: string;
  customer_id: string;
  message_type: string;
  message_content: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useCrmMessages(customerId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['crm_messages', customerId],
    queryFn: async () => {
      let q = supabase.from('crm_messages').select('*').order('created_at', { ascending: false });
      if (customerId) q = q.eq('customer_id', customerId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmMessage[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm_messages'] });

  return { ...query, invalidate };
}
