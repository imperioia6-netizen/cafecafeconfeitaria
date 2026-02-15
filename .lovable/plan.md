

# Pedidos do Cardapio Digital + Rastreamento estilo iFood

## Resumo

Os pedidos feitos pelo cardapio digital ja aparecem na aba "Pedidos Abertos" (status `aberto`), mas a interface nao diferencia o canal nem oferece controle de entrega. Este plano adiciona:

1. **Distincao visual** entre pedidos locais, delivery e cardapio digital
2. **Rastreamento estilo iFood** para pedidos delivery com barra de progresso, tempo estimado e countdown

## Etapa 1 - Migracao de banco de dados

Adicionar 3 colunas na tabela `orders`:

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_delivery_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz DEFAULT NULL;
```

- `delivery_status`: `recebido`, `preparando`, `saiu_entrega`, `entregue`
- `estimated_delivery_minutes`: tempo estimado (ex: 30, 45)
- `delivery_started_at`: quando saiu para entrega (para countdown)

## Etapa 2 - Edge function (public-order)

No `supabase/functions/public-order/index.ts`, ao criar pedido com canal `cardapio_digital`, definir `delivery_status: 'recebido'` automaticamente no insert.

## Etapa 3 - Hook useOrders

Adicionar `useUpdateDeliveryStatus` em `src/hooks/useOrders.ts`:

```typescript
export function useUpdateDeliveryStatus() {
  // mutation para atualizar delivery_status, estimated_delivery_minutes, delivery_started_at
}
```

## Etapa 4 - Interface dos cards de pedidos (Orders.tsx)

### Badges de canal com cores distintas

- **Balcao**: badge cinza neutro
- **Delivery / Cardapio Digital**: badge laranja com icone de caminhao (Truck)
- **Cardapio Digital local**: badge verde

### Telefone do cliente

Exibir `customer_phone` quando disponivel (pedidos do cardapio digital)

### Painel de delivery (apenas para pedidos delivery/cardapio_digital)

Dentro de cada card de pedido delivery:

1. **Barra de progresso** com 4 etapas visuais: Recebido → Preparando → Saiu p/ Entrega → Entregue
2. **Input de tempo estimado** em minutos (30, 45, 60)
3. **Botoes de acao** para avancar status:
   - "Preparando" → seta `delivery_status = 'preparando'`
   - "Saiu p/ Entrega" → seta `delivery_status = 'saiu_entrega'` + registra `delivery_started_at`
   - "Entregue" → seta `delivery_status = 'entregue'`
4. **Countdown em tempo real** mostrando minutos restantes quando saiu para entrega (useEffect + setInterval)

### Layout visual do card redesenhado

```text
+--------------------------------------------+
| #CD-ABC123   Delivery (laranja)    14:35   |
+--------------------------------------------+
| Cliente: Maria Silva   Tel: (11) 99999     |
|                                            |
| 2x Bolo de Chocolate         R$ 230,00    |
| 1x Torta de Limao            R$ 45,00     |
|   Obs: Sem cobertura                      |
|                                            |
| [●]──[●]──[○]──[○]                        |
|  Recebido  Preparando  Entrega  Entregue  |
|                                            |
| Tempo estimado: [30] min   Restam: 22min  |
|                                            |
| Total                        R$ 275,00    |
| [Cancelar]  [Preparando >>]  [Finalizar]  |
+--------------------------------------------+
```

### Tambem atualizar channelLabels

Adicionar `cardapio_digital: 'Cardapio Digital'` ao mapa de labels.

## Arquivos modificados

1. **Nova migracao SQL** - 3 colunas em `orders`
2. **`src/integrations/supabase/types.ts`** - regenerado com novos campos
3. **`supabase/functions/public-order/index.ts`** - adicionar `delivery_status: 'recebido'`
4. **`src/hooks/useOrders.ts`** - novo hook `useUpdateDeliveryStatus`
5. **`src/pages/Orders.tsx`** - badges de canal, info do cliente, tracker de delivery, countdown, botoes de status

## Consideracoes

- Pedidos de balcao nao mostram o painel de delivery (delivery_status fica null)
- O refetch a cada 15s ja garante que novos pedidos do cardapio digital aparecem rapidamente
- O countdown atualiza a cada segundo no frontend via setInterval
- Pedidos com `delivery_status = 'entregue'` ainda ficam visiveis ate serem finalizados (cobrar pagamento)

