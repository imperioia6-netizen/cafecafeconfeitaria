

# Refatoracao: Produto unico com variantes Inteiro + Fatia e estoque em gramas

## Problema atual

Hoje, cada produto (`recipes`) tem um unico `sale_price`, um unico `sell_mode` (fatia OU inteiro), e o estoque (`inventory`) e controlado por `slices_available` (inteiro). Isso obriga a duplicar produtos para vender o mesmo bolo inteiro e fatiado, e o estoque nao reflete a realidade (gramas).

## Nova modelagem

### Colunas adicionadas na tabela `recipes`

```sql
ALTER TABLE recipes
  ADD COLUMN sells_whole boolean NOT NULL DEFAULT false,
  ADD COLUMN sells_slice boolean NOT NULL DEFAULT true,
  ADD COLUMN whole_weight_grams numeric DEFAULT NULL,
  ADD COLUMN slice_weight_grams numeric DEFAULT NULL,
  ADD COLUMN whole_price numeric DEFAULT NULL,
  ADD COLUMN slice_price numeric DEFAULT NULL,
  ADD COLUMN cost_per_gram numeric DEFAULT NULL;
```

- `sells_whole` / `sells_slice`: toggles de modo de venda
- `whole_weight_grams`: peso do bolo inteiro em gramas (ex: 3000)
- `slice_weight_grams`: peso da fatia em gramas (ex: 250) -- substitui `slice_weight_g`
- `whole_price` / `slice_price`: preco de cada variante
- `cost_per_gram`: custo por grama (calculado a partir de `direct_cost / peso_total` ou informado direto)

### Coluna adicionada na tabela `inventory`

```sql
ALTER TABLE inventory
  ADD COLUMN stock_grams numeric NOT NULL DEFAULT 0;
```

### Coluna adicionada na tabela `sale_items` e `order_items`

```sql
ALTER TABLE sale_items ADD COLUMN unit_type text DEFAULT 'slice';
ALTER TABLE order_items ADD COLUMN unit_type text DEFAULT 'slice';
```

Valores: `'whole'` ou `'slice'` -- para saber como foi vendido.

### Migracao de dados existentes

```sql
-- Preencher novos campos a partir dos existentes
UPDATE recipes SET
  sells_slice = (sell_mode = 'fatia' OR sell_mode IS NULL),
  sells_whole = (sell_mode = 'inteiro'),
  slice_weight_grams = slice_weight_g,
  whole_weight_grams = CASE WHEN sell_mode = 'inteiro' THEN weight_kg * 1000 ELSE NULL END,
  slice_price = CASE WHEN sell_mode = 'fatia' OR sell_mode IS NULL THEN sale_price ELSE NULL END,
  whole_price = CASE WHEN sell_mode = 'inteiro' THEN sale_price ELSE NULL END,
  cost_per_gram = CASE
    WHEN direct_cost IS NOT NULL AND slice_weight_g > 0 THEN direct_cost / slice_weight_g
    ELSE NULL
  END;

-- Converter inventory de slices para gramas
UPDATE inventory SET
  stock_grams = slices_available * COALESCE(
    (SELECT r.slice_weight_g FROM recipes r WHERE r.id = inventory.recipe_id), 250
  );
```

## Mudancas por arquivo

### 1. Migracao SQL (nova)

Uma unica migration com todas as alteracoes acima (ADD COLUMN + UPDATE de dados existentes).

### 2. `src/integrations/supabase/types.ts`

Atualizar tipos para incluir novos campos nas tabelas `recipes`, `inventory`, `sale_items`, `order_items`.

### 3. `src/components/recipes/RecipeForm.tsx` (Admin - cadastro/edicao)

Substituir os campos atuais (`sell_mode`, `slice_weight_g`, `weight_kg`, `sale_price`, `direct_cost`) por:

- Toggle "Vende Inteiro" + Toggle "Vende Fatia" (pelo menos um deve estar ativo)
- Campo `whole_weight_grams` (peso bolo inteiro em g) -- visivel se "Vende Inteiro" ativo
- Campo `slice_weight_grams` (peso fatia em g) -- visivel se "Vende Fatia" ativo
- Campo `whole_price` (preco inteiro) -- visivel se "Vende Inteiro"
- Campo `slice_price` (preco fatia) -- visivel se "Vende Fatia"
- Campo `direct_cost` (custo total da receita)
- Campo calculado: custo por grama = `direct_cost / whole_weight_grams`
- Painel de calculo em tempo real mostrando margem por inteiro e margem por fatia

O schema Zod sera atualizado para validar que pelo menos um modo esta ativo e que os campos correspondentes estao preenchidos.

### 4. `src/components/recipes/RecipeCard.tsx` (Admin - listagem)

- Mostrar "a partir de R$ X" (menor preco entre variantes ativas)
- Mostrar badges: "Inteiro" e/ou "Fatia" 
- Calcular margem para cada variante e exibir

### 5. `src/hooks/useProductions.ts` e `src/pages/Production.tsx`

- Ao registrar producao: converter `weight_produced_g` diretamente para `stock_grams` no inventory (somar)
- Remover calculo de `slices_generated` como campo principal -- manter como calculo derivado para exibicao
- Preview de producao: mostrar "Rende X fatias" e "Rende Y inteiros" calculados do peso
- Inventory insert: setar `stock_grams = weight_produced_g`

### 6. `src/hooks/useInventory.ts` e `src/components/inventory/VitrineTab.tsx`

- Exibir estoque em gramas
- Calcular e mostrar fatias disponiveis = `floor(stock_grams / slice_weight_grams)`
- Calcular e mostrar inteiros disponiveis = `floor(stock_grams / whole_weight_grams)`

### 7. `src/hooks/useSales.ts` e `src/pages/Sales.tsx` (POS admin)

- Ao vender: decrementar `stock_grams` do inventory pelo peso correspondente
  - Se inteiro: `stock_grams -= whole_weight_grams * qtd`
  - Se fatia: `stock_grams -= slice_weight_grams * qtd`
- Cart item agora inclui `unit_type` ('whole' ou 'slice') e peso correspondente
- Exibir opcao de selecao Inteiro/Fatia quando produto tem ambos modos

### 8. `src/pages/Cardapio.tsx` (visao cliente)

- No modal do produto: seletor "Inteiro" / "Fatia" (apenas opcoes habilitadas)
- Mostrar preco de cada opcao
- Mostrar disponibilidade em tempo real:
  - "Disponiveis: 2 inteiros" = `floor(stock_grams / whole_weight_grams)`
  - "Disponiveis: 18 fatias" = `floor(stock_grams / slice_weight_grams)`
- Desabilitar opcao se estoque insuficiente (`stock_grams < unit_weight_grams`)
- Card do produto: "a partir de R$ X" (menor preco ativo)

### 9. `src/pages/Orders.tsx` (pedidos internos)

- Ao adicionar item ao carrinho: incluir seletor Inteiro/Fatia no dialog do produto
- Ao criar pedido: salvar `unit_type` em cada `order_item`
- Na listagem de pedidos abertos: exibir se cada item e "Inteiro" ou "Fatia"

### 10. `supabase/functions/public-order/index.ts`

- Aceitar `unit_type` por item no body
- Buscar `whole_price`, `slice_price`, `sells_whole`, `sells_slice` do produto
- Usar preco correto conforme `unit_type`
- Validar que o modo esta habilitado
- Salvar `unit_type` no `order_items`

### 11. `src/hooks/useOrders.ts`

- `useFinalizeOrder`: ao converter pedido em venda, decrementar `stock_grams` do inventory conforme `unit_type` e peso
- Incluir `unit_type` e peso no `sale_items`

## Campos antigos que serao mantidos (retrocompatibilidade)

- `sale_price`: sera preenchido com o menor preco ativo (para queries simples)
- `slice_weight_g`: sera espelhado de `slice_weight_grams`
- `slices_available`: sera calculado como `floor(stock_grams / slice_weight_grams)` via trigger ou mantido em sync

## Sequencia de implementacao

1. Migracao SQL (adicionar colunas + migrar dados)
2. Atualizar types.ts
3. RecipeForm (cadastro com variantes)
4. RecipeCard (exibicao com variantes)
5. Production (estoque em gramas)
6. Inventory hooks + vitrine
7. Sales POS (selecao de variante)
8. Cardapio cliente (selecao + disponibilidade)
9. Orders + public-order edge function
10. Testes end-to-end

## Regras de negocio criticas

- Nunca duplicar produtos. Um produto = uma linha em `recipes` com N variantes
- Estoque sempre em gramas. Fatias e inteiros sao calculos derivados
- Se `stock_grams < unit_weight`, desabilitar opcao e mostrar "Indisponivel"
- Para categorias que nao sao bolo (torta, salgado, bebida, doce, outro): manter comportamento simples (apenas `sells_slice = true` com `slice_weight_grams` representando peso unitario)

