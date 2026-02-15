
# Pagina Separada de Pedidos (Comandas)

## Resumo

Criar uma pagina dedicada para gerenciar pedidos/comandas em andamento, separada das vendas finalizadas. Funcionarios podem criar, visualizar e finalizar pedidos. Ao finalizar um pedido, ele vira uma venda automaticamente.

## Fluxo do Sistema

```text
+------------------+       Finalizar        +------------------+
|    PEDIDOS       | ---------------------> |     VENDAS       |
|  (em andamento)  |   converte pedido      |  (finalizadas)   |
|                  |   em venda + desconta  |                  |
|  - comanda       |   estoque              |  - historico     |
|  - mesa          |                        |  - caixa         |
|  - cliente       |                        |  - relatorios    |
|  - itens         |                        |                  |
+------------------+                        +------------------+
```

## Banco de Dados

### Nova tabela `orders`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| operator_id | uuid NOT NULL | Quem criou o pedido |
| order_number | text | Numero da comanda |
| table_number | text | Numero da mesa |
| customer_name | text | Nome do cliente |
| status | enum `order_status` | `aberto`, `finalizado`, `cancelado` |
| channel | sales_channel | Canal (balcao, delivery) |
| notes | text | Observacoes gerais |
| created_at | timestamptz | Data de criacao |
| closed_at | timestamptz | Data de finalizacao |

### Nova tabela `order_items`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| order_id | uuid FK | Referencia ao pedido |
| recipe_id | uuid | Produto |
| inventory_id | uuid | Lote do estoque |
| quantity | integer | Quantidade |
| unit_price | numeric | Preco unitario |
| subtotal | numeric | Subtotal |

### RLS Policies

- Owner: ALL em ambas tabelas
- Employee: SELECT + INSERT + UPDATE em `orders` (filtrado por `operator_id = auth.uid()`)
- Employee: SELECT + INSERT em `order_items`

## Novos Arquivos

### `src/hooks/useOrders.ts`

Hook com:
- `useOpenOrders()` -- lista pedidos com status `aberto`, incluindo itens e receitas
- `useCreateOrder()` -- cria pedido com itens
- `useAddOrderItem()` -- adiciona item a pedido existente
- `useRemoveOrderItem()` -- remove item de pedido
- `useFinalizeOrder()` -- muda status para `finalizado`, cria venda automaticamente (reutiliza logica do `useCreateSale`) e desconta estoque
- `useCancelOrder()` -- muda status para `cancelado`

### `src/pages/Orders.tsx`

Pagina com duas secoes:

**1. Novo Pedido (lado esquerdo)**
- Catalogo de produtos disponiveis (com foto e preco, igual a pagina de Vendas)
- Clique para adicionar ao pedido

**2. Pedidos Abertos (lado direito / abaixo)**
- Cards de cada pedido aberto mostrando:
  - Comanda, mesa, nome do cliente
  - Lista de itens com quantidades
  - Total parcial
  - Botoes: "Adicionar Item", "Finalizar" (abre dialog de pagamento), "Cancelar"

**Dialog de Finalizacao:**
- Selecionar metodo de pagamento
- Confirmar total
- Ao confirmar: cria venda, desconta estoque, fecha pedido

## Alteracoes em Arquivos Existentes

### `src/components/layout/AppSidebar.tsx`
- Adicionar item "Pedidos" com icone `ClipboardList` no grupo Operacional, antes de Vendas
- `ownerOnly: false` (acessivel a funcionarios)

### `src/App.tsx`
- Adicionar rota `/orders` apontando para `Orders`

## Detalhes Tecnicos

- O enum `order_status` sera criado via migracao: `CREATE TYPE order_status AS ENUM ('aberto', 'finalizado', 'cancelado')`
- Ao finalizar, a logica reutiliza o mesmo fluxo de criacao de venda (insert em `sales` + `sale_items` + update `inventory`)
- Pedidos cancelados nao afetam estoque (itens nao sao descontados ate a finalizacao)
- Campos de comanda e mesa aceitam texto livre com `maxLength` para seguranca
