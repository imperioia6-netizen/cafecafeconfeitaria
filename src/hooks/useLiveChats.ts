import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ChatConversation {
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  remote_jid: string;
  ia_lock_at: string | null;
  last_message: string | null;
  last_message_at: string;
  last_message_type: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  message_type: string;
  message_content: string | null;
  status: string;
  created_at: string;
}

export function useLiveChats() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Fetch conversations grouped by customer
  const conversationsQuery = useQuery({
    queryKey: ['live_chats_conversations'],
    queryFn: async () => {
      // Get all whatsapp messages with customer info
      const { data: messages, error } = await supabase
        .from('crm_messages')
        .select('customer_id, message_type, message_content, created_at')
        .in('message_type', ['whatsapp_entrada', 'whatsapp_saida'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique customer IDs
      const customerIds = [...new Set((messages || []).map(m => m.customer_id))];
      if (customerIds.length === 0) return [];

      // Fetch customer details
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, phone, remote_jid, ia_lock_at')
        .in('id', customerIds);

      if (custError) throw custError;

      const customerMap = new Map((customers || []).map(c => [c.id, c]));

      // Group by customer
      const convMap = new Map<string, ChatConversation>();
      for (const msg of (messages || [])) {
        if (!convMap.has(msg.customer_id)) {
          const cust = customerMap.get(msg.customer_id);
          if (!cust) continue;
          convMap.set(msg.customer_id, {
            customer_id: msg.customer_id,
            customer_name: cust.name,
            customer_phone: cust.phone,
            remote_jid: cust.remote_jid,
            ia_lock_at: cust.ia_lock_at,
            last_message: msg.message_content,
            last_message_at: msg.created_at,
            last_message_type: msg.message_type,
            unread_count: 0,
          });
        }
      }

      return Array.from(convMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
    refetchInterval: 10000,
  });

  // Fetch messages for a specific customer
  const useCustomerMessages = (customerId: string | null) => {
    return useQuery({
      queryKey: ['live_chat_messages', customerId],
      queryFn: async () => {
        if (!customerId) return [];
        const { data, error } = await supabase
          .from('crm_messages')
          .select('id, message_type, message_content, status, created_at')
          .eq('customer_id', customerId)
          .in('message_type', ['whatsapp_entrada', 'whatsapp_saida'])
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data as ChatMessage[];
      },
      enabled: !!customerId,
      refetchInterval: 5000,
    });
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('live-chats-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'crm_messages',
      }, () => {
        qc.invalidateQueries({ queryKey: ['live_chats_conversations'] });
        qc.invalidateQueries({ queryKey: ['live_chat_messages'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Toggle IA lock
  const toggleIaLock = useMutation({
    mutationFn: async ({ customerId, lock }: { customerId: string; lock: boolean }) => {
      const updates = lock
        ? { ia_lock_at: new Date().toISOString(), ia_lock_reason: 'owner_takeover' }
        : { ia_lock_at: null, ia_lock_reason: null };
      const { error } = await supabase
        .from('customers')
        .update(updates as any)
        .eq('id', customerId);
      if (error) throw error;
    },
    onSuccess: (_, { lock }) => {
      qc.invalidateQueries({ queryKey: ['live_chats_conversations'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: lock ? 'Conversa retomada! Você está no controle.' : 'IA reativada para este cliente.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({ remoteJid, message, customerId }: { remoteJid: string; message: string; customerId: string }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { remote_jid: remoteJid, message, customer_id: customerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live_chat_messages'] });
      qc.invalidateQueries({ queryKey: ['live_chats_conversations'] });
    },
    onError: (e: any) => toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' }),
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    useCustomerMessages,
    toggleIaLock,
    sendMessage,
  };
}
