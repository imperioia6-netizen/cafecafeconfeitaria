import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InfluenceDiscount {
  id: string;
  customer_id: string;
  instagram_post_url: string | null;
  followers_at_time: number;
  discount_percent: number;
  sale_id: string | null;
  created_at: string;
}

export function useInfluence() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['influence_discounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('influence_discounts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as InfluenceDiscount[];
    },
  });

  const createDiscount = useMutation({
    mutationFn: async (discount: Partial<InfluenceDiscount>) => {
      const { data, error } = await supabase.from('influence_discounts').insert(discount as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['influence_discounts'] });
      toast({ title: 'Desconto registrado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createDiscount };
}
