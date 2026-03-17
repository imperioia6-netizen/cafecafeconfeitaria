

# Plano: Encaminhar pedidos do agente para a plataforma externa

## Problema

A edge function `confirm-payment` cria pedidos e encomendas quando o dono confirma um comprovante, mas **não encaminha para a plataforma externa** (TicketFlow/receive-orders). As versões dessas funções no `evolution-webhook` já fazem isso, mas as cópias simplificadas no `confirm-payment` não têm essa chamada.

## Correção

Editar `supabase/functions/confirm-payment/index.ts` para:

1. Importar `sendTicketFlowOrder` de `../_shared/ticketflow.ts`
2. Após criar o pedido em `createOrderFromPayload`, chamar `sendTicketFlowOrder` com type `"pedido"` e os itens
3. Após criar a encomenda em `createEncomendaFromPayload`, chamar `sendTicketFlowOrder` com type `"encomenda"`

Isso replica o mesmo comportamento que já existe no `evolution-webhook` (linhas 763-785 e 905-924), garantindo que todo pedido/encomenda criado pelo agente vá para a plataforma vinculada.

