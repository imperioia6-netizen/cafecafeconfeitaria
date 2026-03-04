import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LeadStatus = 'novo_seguidor' | 'mensagem_enviada' | 'convertido' | 'cliente' | 'novo_lead' | 'em_negociacao' | 'proposta_aceita';

export type LeadSource = 'instagram' | 'whatsapp' | 'indicacao' | 'site' | 'outro';
export type LeadPriority = 'alta' | 'media' | 'baixa';

export interface SocialLead {
  id: string;
  instagram_handle: string;
  followers_count: number;
  status: LeadStatus;
  customer_id: string | null;
  offer_sent: string | null;
  converted_at: string | null;
  created_at: string;
  name: string | null;
  phone: string | null;
  potential_value: number;
  notes: string | null;
  stage_changed_at: string | null;
  email: string | null;
  source: LeadSource;
  priority: LeadPriority;
  follow_up_date: string | null;
  product_interest: string | null;
}

export function useSocialLeads() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['social_leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('social_leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as SocialLead[];
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: { instagram_handle: string; followers_count?: number; name?: string; phone?: string; potential_value?: number; notes?: string; status?: string; email?: string; source?: string; priority?: string; follow_up_date?: string; product_interest?: string }) => {
      const { data, error } = await supabase.from('social_leads').insert(lead as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_leads'] });
      toast({ title: 'Lead cadastrado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; customer_id?: string; offer_sent?: string; converted_at?: string; name?: string; phone?: string; potential_value?: number; notes?: string; stage_changed_at?: string; email?: string; source?: string; priority?: string; follow_up_date?: string | null; product_interest?: string }) => {
      const { error } = await supabase.from('social_leads').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_leads'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('social_leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_leads'] });
      toast({ title: 'Lead removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createLead, updateLead, deleteLead };
}
