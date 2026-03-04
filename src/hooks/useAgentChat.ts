import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (text: string, pdfFile?: File | null) => {
    const trimmed = text.trim();
    if ((!trimmed && !pdfFile) || loading) return;

    const displayContent = trimmed ? (pdfFile ? `${trimmed} [+ PDF anexado]` : trimmed) : '[PDF anexado]';
    setMessages((prev) => [...prev, { role: 'user', content: displayContent }]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Faça login para usar o assistente', variant: 'destructive' });
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      let pdfBase64: string | undefined;
      if (pdfFile && pdfFile.size > 0 && pdfFile.size <= 5 * 1024 * 1024 && pdfFile.type === 'application/pdf') {
        const buffer = await pdfFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const binary = bytes.reduce((acc, b) => acc + String.fromCharCode(b), '');
        pdfBase64 = btoa(binary);
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            message: trimmed || (pdfBase64 ? 'Analise o conteúdo do PDF anexado.' : ''),
            origin: 'app',
            history: messages.slice(-9).map(m => ({ role: m.role, content: m.content })),
            ...(pdfBase64 && { pdfBase64 }),
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao conversar com o assistente');
      }

      const reply = result.reply ?? 'Sem resposta.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message ?? 'Tente novamente.', variant: 'destructive' });
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente em instantes.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, toast, messages]);

  return { messages, loading, sendMessage };
}
