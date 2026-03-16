import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Fire-and-forget: encaminha encomenda para a plataforma externa */
function fireForwardOrder(payload: Record<string, unknown>) {
  supabase.functions.invoke('forward-order', { body: payload }).catch((e) => {
    console.error('forward-order invoke error', e);
  });
}

export type EncomendaStatus = 'pendente' | 'confirmado' | '50_pago' | 'em_preparo' | 'entregue' | 'cancelado';
export type EncomendaPaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro';

export interface Encomenda {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  product_description: string;
  quantity: number;
  total_value: number;
  address: string | null;
  payment_method: string;
  paid_50_percent: boolean;
  observations: string | null;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  status: EncomendaStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface EncomendaInsert {
  customer_name: string;
  customer_phone?: string | null;
  product_description: string;
  quantity?: number;
  total_value: number;
  address?: string | null;
  payment_method: EncomendaPaymentMethod;
  paid_50_percent?: boolean;
  observations?: string | null;
  delivery_date?: string | null;
  delivery_time_slot?: string | null;
  status?: EncomendaStatus;
  source?: string | null;
}

export function useEncomendas(
  statusFilter?: EncomendaStatus | 'todos',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['encomendas', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('encomendas')
        .select('*')
        .order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'todos') {
        q = q.eq('status', statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Encomenda[];
    },
    enabled: options?.enabled !== false,
  });
}

export function useCreateEncomenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EncomendaInsert) => {
      const { data, error } = await supabase
        .from('encomendas')
        .insert({
          customer_name: input.customer_name,
          customer_phone: input.customer_phone ?? null,
          product_description: input.product_description,
          quantity: input.quantity ?? 1,
          total_value: input.total_value,
          address: input.address ?? null,
          payment_method: input.payment_method,
          paid_50_percent: input.paid_50_percent ?? false,
          observations: input.observations ?? null,
          delivery_date: input.delivery_date ?? null,
          delivery_time_slot: input.delivery_time_slot ?? null,
          status: input.status ?? 'pendente',
          source: input.source ?? 'whatsapp',
        })
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget: encaminha encomenda para plataforma externa
      fireForwardOrder({
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        items: [{
          product_name: input.product_description,
          quantity: input.quantity ?? 1,
          unit_price: input.total_value / (input.quantity ?? 1),
        }],
        payment_method: input.payment_method,
        delivery_date: input.delivery_date,
        delivery_time: input.delivery_time_slot,
        delivery_type: 'delivery',
        address: input.address,
      });

      return data as Encomenda;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encomendas'] }),
  });
}

export function useUpdateEncomenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paid_50_percent,
      status,
      ...rest
    }: Partial<Encomenda> & { id: string }) => {
      const updates: Record<string, unknown> = { ...rest };
      if (typeof paid_50_percent === 'boolean') updates.paid_50_percent = paid_50_percent;
      if (status) updates.status = status;
      const { data, error } = await supabase
        .from('encomendas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Encomenda;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encomendas'] }),
  });
}

export const encomendaStatusLabels: Record<EncomendaStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  '50_pago': '50% pago',
  em_preparo: 'Em preparo',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const encomendaPaymentLabels: Record<EncomendaPaymentMethod, string> = {
  pix: 'PIX',
  credito: 'Cartão crédito',
  debito: 'Cartão débito',
  dinheiro: 'Dinheiro',
};
