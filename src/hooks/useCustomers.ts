import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram_handle: string | null;
  instagram_followers: number;
  birthday: string | null;
  family_name: string | null;
  family_birthday: string | null;
  preferred_channel: string;
  favorite_recipe_id: string | null;
  last_purchase_at: string | null;
  total_spent: number;
  status: 'ativo' | 'inativo' | 'novo';
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

export function useCustomers(statusFilter?: string) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['customers', statusFilter],
    queryFn: async () => {
      let q = supabase.from('customers').select('*').order('name');
      if (statusFilter && statusFilter !== 'todos') {
        q = q.eq('status', statusFilter as any);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (customer: Partial<CustomerInsert>) => {
      const { data, error } = await supabase.from('customers').insert(customer as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Cliente cadastrado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomerInsert>) => {
      const { error } = await supabase.from('customers').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Cliente atualizado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Cliente removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createCustomer, updateCustomer, deleteCustomer };
}
