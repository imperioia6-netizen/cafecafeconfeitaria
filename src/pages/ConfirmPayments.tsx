import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Phone, User, MessageSquareWarning, Receipt } from "lucide-react";
import { toast } from "sonner";
import AgentQueriesTab from "@/components/confirm/AgentQueriesTab";

type PaymentStatus = "pending" | "confirmed" | "rejected";

interface PaymentConfirmation {
  id: string;
  customer_name: string;
  customer_phone: string;
  description: string;
  type: string;
  status: PaymentStatus;
  created_at: string;
}

const ConfirmPayments = () => {
  const [items, setItems] = useState<PaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [queryCount, setQueryCount] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_confirmations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar comprovantes");
    } else {
      setItems((data as PaymentConfirmation[]) || []);
    }
    setLoading(false);
  };

  const loadQueryCount = async () => {
    const { count } = await supabase
      .from("agent_queries" as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setQueryCount(count || 0);
  };

  useEffect(() => {
    load();
    loadQueryCount();

    const channel = supabase
      .channel("confirm_payments_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_confirmations" },
        () => { load(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_queries" },
        () => { loadQueryCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAction = async (id: string, action: "confirmed" | "rejected") => {
    setUpdatingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-payment", {
        body: { id, action },
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || "Erro desconhecido");
      toast.success(action === "confirmed" ? "Pagamento confirmado e pedido criado!" : "Comprovante recusado. Mensagem enviada ao cliente.");
      await load();
    } catch (e) {
      toast.error("Erro ao processar: " + (e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Central de Aprovações</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">
            Comprovantes de pagamento e consultas da IA aguardando sua resposta.
          </p>
        </div>

        <Tabs defaultValue="comprovantes" className="w-full">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="comprovantes" className="flex-1 gap-1.5">
              <Receipt className="h-4 w-4" />
              Comprovantes
              {items.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {items.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="consultas" className="flex-1 gap-1.5">
              <MessageSquareWarning className="h-4 w-4" />
              Consultas
              {queryCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 animate-pulse">
                  {queryCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comprovantes">
            <div className="card-cinematic rounded-xl">
              <div className="p-6 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    Nenhum comprovante pendente no momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border rounded-lg px-5 py-4 bg-background/60"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[11px]">
                              {item.type === "encomenda" ? "Encomenda" : "Pedido"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1.5 font-semibold text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {item.customer_name}
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {item.customer_phone}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            Recebido em {new Date(item.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                            disabled={updatingId === item.id}
                            onClick={() => handleAction(item.id, "confirmed")}
                          >
                            {updatingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            )}
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive"
                            disabled={updatingId === item.id}
                            onClick={() => handleAction(item.id, "rejected")}
                          >
                            {updatingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
                            )}
                            Recusar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="consultas">
            <div className="card-cinematic rounded-xl">
              <div className="p-6">
                <AgentQueriesTab />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ConfirmPayments;
