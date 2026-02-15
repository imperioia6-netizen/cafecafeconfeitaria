

# Pedidos do Cardapio Digital na tela de Pedidos + Rastreamento estilo iFood

## O que muda

1. Os pedidos feitos pelo cardapio digital (por clientes) ja aparecem na aba "Pedidos Abertos" pois sao criados com status `aberto`. Porem, a interface nao diferencia se o pedido e local, delivery ou do cardapio digital. Vamos adicionar essa distincao visual.

2. Para pedidos de delivery, o operador podera gerenciar o status da entrega no estilo iFood: definir tempo estimado, marcar como "Preparando", "Saiu para entrega" e "Entregue", com contador regressivo visivel.

## Mudancas no banco de dados

Adicionar 3 colunas na tabela `orders`:

```sql
ALTER TABLE public.orders
  ADD COLUMN delivery_status text DEFAULT NULL,
  ADD COLUMN estimated_delivery_minutes integer DEFAULT NULL,
  ADD COLUMN delivery_started_at timestamptz DEFAULT NULL;
```

- `delivery_status`: valores como `preparando`, `saiu_entrega`, `entregue` (null para pedidos locais)
- `estimated_delivery_minutes`: tempo estimado em minutos para entrega
- `delivery_started_at`: timestamp de quando o pedido saiu para entrega (para calcular countdown)

## Mudancas na interface (src/pages/Orders.tsx)

### Cards de pedidos abertos - Indicadores visuais

Cada card de pedido recebera:

- **Badge de canal** com cores distintas:
  - Balcao: badge neutro cinza
  - Delivery / Cardapio Digital (delivery): badge laranja com icone de moto/caminhao
  - Cardapio Digital (local): badge verde com icone de mesa
- **Nome do cliente e telefone** (para pedidos do cardapio digital que tem `customer_phone`)
- **Hora do pedido** ja existe, mantida

### Painel de delivery (estilo iFood)

Para pedidos com canal `delivery` ou `cardapio_digital`, exibir dentro do card:

1. **Barra de progresso** com 3 etapas: Recebido -> Preparando -> Saiu para entrega -> Entregue
2. **Campo para definir tempo estimado** (input de minutos, ex: 30, 45, 60)
3. **Botoes de acao** para avancar o status:
   - "Iniciar Preparo" (seta delivery_status para `preparando`)
   - "Saiu para Entrega" (seta delivery_status para `saiu_entrega` e registra `delivery_started_at`)
   - "Entregue" (seta delivery_status para `entregue`)
4. **Countdown** mostrando tempo restante estimado quando saiu para entrega (atualiza a cada segundo)

### Layout do card redesenhado

```text
+--------------------------------------------+
| #CD-ABC123   🛵 Delivery    14:35          |
+--------------------------------------------+
| 👤 Maria Silva  📱 (11) 99999-0000        |
|                                            |
| 2x Bolo de Chocolate         R$ 230,00    |
| 1x Torta de Limao            R$ 45,00     |
|   📝 Sem cobertura                        |
|                                            |
| ● Recebido ─── ● Preparando ─── ○ Entrega |
| ⏱ Tempo estimado: [30] min                |
|                                            |
| Total                        R$ 275,00    |
| [Cancelar]  [Preparando ▶]  [Finalizar]   |
+--------------------------------------------+
```

## Mudancas no hook (src/hooks/useOrders.ts)

- Adicionar hook `useUpdateDeliveryStatus` para atualizar `delivery_status`, `estimated_delivery_minutes` e `delivery_started_at`
- Atualizar `useOpenOrders` para tambem incluir `customer_phone` nos dados retornados (ja vem do select `*`)

## Mudancas no edge function (supabase/functions/public-order/index.ts)

- Ao criar pedido do cardapio digital com canal `cardapio_digital`, definir `delivery_status = 'recebido'` automaticamente para pedidos de delivery

## Detalhes tecnicos

### Arquivo: `src/hooks/useOrders.ts`

Novo hook:

```typescript
export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      delivery_status: string;
      estimated_delivery_minutes?: number;
      delivery_started_at?: string;
    }) => {
      const update: any = { delivery_status: input.delivery_status };
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
```

### Arquivo: `src/pages/Orders.tsx`

- Importar icones: `Truck`, `Clock`, `MapPin`, `Phone`
- Adicionar labels de canal: `cardapio_digital: 'Cardápio Digital'`
- Criar componente `DeliveryTracker` inline com barra de progresso de 3 etapas
- Criar componente `DeliveryCountdown` com `useEffect` + `setInterval` para countdown em tempo real
- Adicionar input de minutos estimados e botoes de acao de status no card de pedidos delivery
- Condicional: so exibir painel de delivery quando `order.channel === 'delivery' || order.channel === 'cardapio_digital'`

### Arquivo: `supabase/functions/public-order/index.ts`

- Adicionar `delivery_status: 'recebido'` ao insert do pedido quando o canal for `cardapio_digital`

### Migracao SQL

Uma unica migration com os 3 novos campos na tabela `orders`.

