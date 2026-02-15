import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/hooks/useSales';

export function useOpenOrders() {
  return useQuery({
    queryKey: ['orders', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, recipes(name, photo_url, sale_price))')
        .eq('status', 'aberto')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      operator_id: string;
      order_number?: string;
      table_number?: string;
      customer_name?: string;
      channel?: string;
      notes?: string;
      items: { recipe_id: string; inventory_id?: string; quantity: number; unit_price: number; notes?: string }[];
    }) => {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          operator_id: input.operator_id,
          order_number: input.order_number || null,
          table_number: input.table_number || null,
          customer_name: input.customer_name || null,
          channel: (input.channel || 'balcao') as any,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      if (input.items.length > 0) {
        const { error: itemsErr } = await supabase.from('order_items').insert(
          input.items.map(i => ({
            order_id: order.id,
            recipe_id: i.recipe_id,
            inventory_id: i.inventory_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.quantity * i.unit_price,
            notes: i.notes || null,
          } as any))
        );
        if (itemsErr) throw itemsErr;
      }
      return order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useAddOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      recipe_id: string;
      inventory_id: string;
      quantity: number;
      unit_price: number;
    }) => {
      const { error } = await supabase.from('order_items').insert({
        order_id: input.order_id,
        recipe_id: input.recipe_id,
        inventory_id: input.inventory_id,
        quantity: input.quantity,
        unit_price: input.unit_price,
        subtotal: input.quantity * input.unit_price,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useRemoveOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useFinalizeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order: any;
      payment_method: string;
      operator_id: string;
    }) => {
      const { order, payment_method, operator_id } = input;
      const items = order.order_items || [];
      const total = items.reduce((s: number, i: any) => s + Number(i.subtotal), 0);

      // Create sale
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          operator_id,
          channel: order.channel || 'balcao',
          payment_method: payment_method as any,
          total,
          order_number: order.order_number,
          table_number: order.table_number,
          customer_name: order.customer_name,
        } as any)
        .select()
        .single();
      if (saleErr) throw saleErr;

      // Create sale items
      const { error: siErr } = await supabase.from('sale_items').insert(
        items.map((i: any) => ({
          sale_id: sale.id,
          recipe_id: i.recipe_id,
          inventory_id: i.inventory_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.subtotal,
        }))
      );
      if (siErr) throw siErr;

      // Deduct inventory
      for (const i of items) {
        if (i.inventory_id) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('slices_available')
            .eq('id', i.inventory_id)
            .single();
          if (inv) {
            await supabase
              .from('inventory')
              .update({ slices_available: inv.slices_available - i.quantity })
              .eq('id', i.inventory_id);
          }
        }
      }

      // Close order
      const { error: closeErr } = await supabase
        .from('orders')
        .update({ status: 'finalizado' as any, closed_at: new Date().toISOString() })
        .eq('id', order.id);
      if (closeErr) throw closeErr;

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      delivery_status: string;
      estimated_delivery_minutes?: number;
      delivery_started_at?: string | null;
    }) => {
      const update: Record<string, any> = { delivery_status: input.delivery_status };
      if (input.estimated_delivery_minutes !== undefined)
        update.estimated_delivery_minutes = input.estimated_delivery_minutes;
      if (input.delivery_started_at !== undefined)
        update.delivery_started_at = input.delivery_started_at;
      const { error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', input.orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelado' as any, closed_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
