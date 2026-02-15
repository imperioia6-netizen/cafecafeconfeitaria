

# Montar Pedido a Partir dos Produtos (Receitas)

## Problema

A tela de Pedidos busca itens apenas do **estoque (inventory)** -- que exige que cada produto tenha sido previamente registrado na Producao. O estoque esta vazio (0 itens), mesmo havendo 15 receitas ativas. Isso impede a montagem de qualquer pedido.

## Solucao

Alterar a pagina de Pedidos para listar **receitas ativas** como catalogo de produtos, em vez de depender exclusivamente do estoque. O vinculo com inventory sera **opcional** -- se houver estoque disponivel para aquele produto, ele sera associado automaticamente; caso contrario, o pedido e criado sem inventory_id.

## Alteracoes

### 1. `src/pages/Orders.tsx`

- Substituir `useInventory()` por `useActiveRecipes()` (do hook ja existente `useRecipes`)
- O grid de produtos mostrara todas as receitas ativas com nome, foto, categoria e preco
- Remover a dependencia de `slices_available` para exibir produtos
- Manter a logica de categorias e busca, mas baseada nas receitas
- O carrinho armazenara `recipe_id` e `unit_price` diretamente da receita
- O campo `inventory_id` sera enviado como `null` quando nao houver estoque vinculado

### 2. `src/hooks/useOrders.ts`

- Tornar `inventory_id` opcional no tipo de input do `useCreateOrder` (ja aceita no banco, pois a coluna e nullable)
- No `useFinalizeOrder`, pular o abate de estoque quando `inventory_id` for null

## Detalhes Tecnicos

### Orders.tsx - Mudancas no catalogo:

```text
Antes:  useInventory() -> filtra slices_available > 0 -> mostra itens do estoque
Depois: useActiveRecipes() -> mostra todas receitas ativas -> carrinho com recipe_id + preco
```

- O tipo `NewOrderItem` perde `max_available` e `inventory_id` se torna opcional
- `addToCart` trabalha com Recipe em vez de InventoryItem
- Categorias e filtro de busca continuam funcionando (recipe.category, recipe.name)

### useOrders.ts - Mudancas:

- `inventory_id` no input de `useCreateOrder` muda para opcional (`inventory_id?: string`)
- No `useFinalizeOrder`, o loop de abate de estoque verifica `if (i.inventory_id)` antes de tentar atualizar (ja faz isso, sem mudanca necessaria)

### Fluxo resultante:

```text
Funcionario abre /orders
  -> Ve todas as 15 receitas ativas como catalogo
  -> Clica para adicionar ao carrinho
  -> Preenche comanda/mesa/cliente
  -> Clica "Abrir Pedido"
  -> Pedido criado sem vinculo obrigatorio ao estoque
```

### Arquivos alterados:
- `src/pages/Orders.tsx` -- trocar fonte de dados de inventory para recipes
- `src/hooks/useOrders.ts` -- tornar inventory_id opcional no create
