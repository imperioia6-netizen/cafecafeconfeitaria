import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface N8nPayload {
  action_type: 'aniversario_cliente' | 'aniversario_familiar' | 'reativacao' | 'social_seller' | 'upsell';
  customer_data: Record<string, any>;
}

export function useCrmN8n() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const trigger = useMutation({
    mutationFn: async (payload: N8nPayload) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-n8n`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao chamar n8n');
      return result;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crm_messages'] });
      if (data.success) {
        toast({ title: 'Mensagem gerada via n8n!' });
      } else {
        toast({ title: 'Erro do n8n', description: data.message, variant: 'destructive' });
      }
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const testConnection = useMutation({
    mutationFn: async (webhookUrl: string) => {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });
      return true;
    },
    onSuccess: () => toast({ title: 'Requisição enviada ao n8n!', description: 'Verifique o histórico do seu webhook no n8n.' }),
    onError: (e: any) => toast({ title: 'Erro de conexão', description: e.message, variant: 'destructive' }),
  });

  return { trigger, testConnection };
}
