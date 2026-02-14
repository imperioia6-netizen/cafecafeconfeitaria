import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutoPromotion {
  id: string;
  inventory_id: string;
  recipe_id: string;
  original_price: number;
  discount_percent: number;
  promo_price: number;
  hours_in_stock: number;
  status: string;
  sent_via: string | null;
  message_content: string | null;
  created_at: string;
  expires_at: string | null;
  sold_at: string | null;
}

export function useAutoPromotions() {
  return useQuery({
    queryKey: ['auto-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_promotions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AutoPromotion[];
    },
    refetchInterval: 60000,
  });
}

export function useGeneratePromotions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('auto-promotion');
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auto-promotions'] }),
  });
}

export interface AiReport {
  id: string;
  report_type: string;
  period_days: number;
  content: string;
  summary: string | null;
  suggestions: any;
  metrics: any;
  created_at: string;
  sent_at: string | null;
  sent_via: string | null;
}

export function useAiReports() {
  return useQuery({
    queryKey: ['ai-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AiReport[];
    },
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (period_days: number) => {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { period_days },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-reports'] }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-reports'] }),
  });
}
