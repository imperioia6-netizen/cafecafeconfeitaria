import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, User, Phone, MessageSquareWarning, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AgentQuery {
  id: string;
  customer_name: string;
  customer_phone: string;
  remote_jid: string;
  query_text: string;
  response_text: string | null;
  status: string;
  created_at: string;
}

const AgentQueriesTab = () => {
  const [queries, setQueries] = useState<AgentQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_queries" as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar consultas");
    } else {
      setQueries((data as any as AgentQuery[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("agent_queries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_queries" },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRespond = async (query: AgentQuery) => {
    const text = responses[query.id]?.trim();
    if (!text) {
      toast.error("Escreva a resposta antes de enviar");
      return;
    }

    setSendingId(query.id);
    try {
      // Send WhatsApp message
      const { error: sendError } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          remote_jid: query.remote_jid,
          message: text,
        },
      });
      if (sendError) throw sendError;

      // Mark as answered
      const { error: updateError } = await supabase
        .from("agent_queries" as any)
        .update({
          status: "answered",
          response_text: text,
          answered_at: new Date().toISOString(),
        } as any)
        .eq("id", query.id);
      if (updateError) throw updateError;

      toast.success("Resposta enviada ao cliente!");
      setResponses((prev) => {
        const next = { ...prev };
        delete next[query.id];
        return next;
      });
      await load();
    } catch (e) {
      toast.error("Erro ao enviar: " + (e as Error).message);
    } finally {
      setSendingId(null);
    }
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("55")) {
      const ddd = digits.slice(2, 4);
      const num = digits.slice(4);
      return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Nenhuma consulta pendente no momento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {queries.map((q) => (
        <div
          key={q.id}
          className="border rounded-xl px-5 py-4 bg-background/60 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 gap-1">
              <MessageSquareWarning className="h-3 w-3" />
              Consulta
            </Badge>
            <span className="flex items-center gap-1.5 font-semibold text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              {q.customer_name}
            </span>
            <a
              href={`https://wa.me/${q.customer_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(q.customer_phone)}
            </a>
          </div>

          {/* Query text */}
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-xs text-muted-foreground mb-1">Dúvida do cliente:</p>
            <p>{q.query_text}</p>
          </div>

          <p className="text-[11px] text-muted-foreground/70">
            Recebido em {new Date(q.created_at).toLocaleString("pt-BR")}
          </p>

          {/* Response area */}
          <div className="space-y-2">
            <Textarea
              placeholder="Escreva a resposta para enviar ao cliente via WhatsApp..."
              value={responses[q.id] || ""}
              onChange={(e) =>
                setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
              className="min-h-[80px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={deletingId === q.id}
                onClick={async () => {
                  setDeletingId(q.id);
                  const { error } = await supabase
                    .from("agent_queries" as any)
                    .delete()
                    .eq("id", q.id);
                  if (error) {
                    toast.error("Erro ao excluir consulta");
                  } else {
                    toast.success("Consulta excluída");
                    await load();
                  }
                  setDeletingId(null);
                }}
                className="gap-1.5"
              >
                {deletingId === q.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir
              </Button>
              <Button
                size="sm"
                disabled={sendingId === q.id || !responses[q.id]?.trim()}
                onClick={() => handleRespond(q)}
                className="gap-1.5"
              >
                {sendingId === q.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Responder via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentQueriesTab;
