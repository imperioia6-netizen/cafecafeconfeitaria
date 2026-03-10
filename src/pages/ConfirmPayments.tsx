import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: PaymentStatus) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("payment_confirmations")
        .update({ status, decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(status === "confirmed" ? "Pagamento confirmado" : "Pagamento recusado");
      await load();
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Comprovar Pagamentos</h1>
          <p className="text-muted-foreground/70 mt-1 tracking-wide text-sm">
            Confirme ou recuse comprovantes enviados pelo WhatsApp. Ao confirmar/recusar, o agente envia a mensagem apropriada para o cliente.
          </p>
        </div>

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
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg px-4 py-3 bg-background/60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[11px]">
                          {item.type === "encomenda" ? "Encomenda" : "Pedido"}
                        </Badge>
                        <span className="font-medium text-sm">
                          Confirmar comprovante de pagamento de {item.customer_name} ({item.customer_phone})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Recebido em {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                        disabled={updatingId === item.id}
                        onClick={() => updateStatus(item.id, "confirmed")}
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
                        onClick={() => updateStatus(item.id, "rejected")}
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
      </div>
    </AppLayout>
  );
};

export default ConfirmPayments;

