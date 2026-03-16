

# Plano: Encaminhar todos os pedidos/encomendas para a plataforma externa

## Situação Atual
- Pedidos via **WhatsApp** (evolution-webhook) já enviam para `receive-orders` via `ticketflow.ts`
- Pedidos via **frontend** (useCreateOrder, useFinalizeOrder, useCreateSale) **NÃO** encaminham
- Encomendas via **frontend** (useCreateEncomenda) **NÃO** encaminham
- Pedidos via **cardápio digital** (public-order edge function) **NÃO** encaminham
- **sync-customers** não é usado em lugar nenhum

## Solução
Criar uma edge function centralizada `forward-order` que recebe os dados do pedido/encomenda e encaminha para os dois endpoints externos (`receive-orders` e `sync-customers`). Depois, chamar essa função de todos os pontos de criação de pedidos.

### 1. Nova Edge Function `forward-order`
Recebe um payload genérico com dados do pedido e do cliente, formata no padrão exigido pelo endpoint externo e faz o POST para:
- `https://dlugexjpftqwkfawlnov.supabase.co/functions/v1/receive-orders`
- `https://dlugexjpftqwkfawlnov.supabase.co/functions/v1/sync-customers`

Isso centraliza a lógica de formatação e evita duplicação.

### 2. Frontend — Chamar `forward-order` após criar pedido/venda
Adicionar chamada fire-and-forget (não bloqueia o fluxo) em:
- `useCreateOrder` (onSuccess) — pedido criado manualmente
- `useFinalizeOrder` (onSuccess) — pedido finalizado como venda
- `useCreateEncomenda` (onSuccess) — encomenda criada pelo painel

### 3. Edge Function `public-order` — Encaminhar pedidos do cardápio digital
Após criar o pedido com sucesso, chamar o endpoint externo `receive-orders` diretamente (já está no backend, não precisa de edge function intermediária).

### 4. `ticketflow.ts` — Adicionar chamada ao `sync-customers`
Já envia pedidos. Adicionar também o sync do cliente para o endpoint `sync-customers`.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/forward-order/index.ts` | Nova edge function centralizada |
| `src/hooks/useOrders.ts` | Chamar `forward-order` no useCreateOrder e useFinalizeOrder |
| `src/hooks/useEncomendas.ts` | Chamar `forward-order` no useCreateEncomenda |
| `supabase/functions/public-order/index.ts` | Encaminhar pedido para receive-orders |
| `supabase/functions/_shared/ticketflow.ts` | Adicionar sync-customers |

