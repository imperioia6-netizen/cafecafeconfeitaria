

# Plano: Corrigir exclusao de produtos

## Problema

A exclusao de produtos falha porque a tabela `recipes` tem chaves estrangeiras em outras tabelas (`order_items`, `sale_items`, `productions`, `inventory`, `recipe_ingredients`, `auto_promotions`, `alerts`). Quando existem registros relacionados, o banco rejeita o `DELETE` por violacao de foreign key.

## Solucao

Alterar `useDeleteRecipe` em `src/hooks/useRecipes.ts` para deletar registros dependentes antes de excluir o produto, e melhorar o feedback de erro.

### Ordem de exclusao:
1. `recipe_ingredients` onde `recipe_id = id`
2. `auto_promotions` onde `recipe_id = id`
3. `alerts` onde `recipe_id = id`
4. `inventory` onde `recipe_id = id` (precisa deletar `order_items`/`sale_items` que referenciam esses inventory_ids primeiro, se houver)
5. `productions` onde `recipe_id = id`
6. `recipes` onde `id = id`

### Alternativa mais segura

Como pedidos e vendas historicas referenciam `recipe_id` via `order_items` e `sale_items`, excluir tudo pode corromper o historico. A abordagem recomendada:

- Tentar o delete simples primeiro
- Se falhar com erro de FK, informar ao usuario que o produto tem pedidos/vendas associados e sugerir **desativar** em vez de excluir
- Deletar apenas dependencias "seguras" (recipe_ingredients, auto_promotions, alerts) antes do delete

### Arquivo alterado
- `src/hooks/useRecipes.ts`: atualizar `useDeleteRecipe` para limpar dependencias seguras e dar feedback claro ao usuario

