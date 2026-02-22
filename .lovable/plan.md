
# Seletor de Fatia/Inteiro no Pedido + Descricao do Produto

## O que muda

### 1. Novo campo "Descricao" no banco e no cadastro do produto
- Adicionar coluna `description` (text, nullable) na tabela `recipes` via migration
- Adicionar campo de textarea "Descricao" no formulario de cadastro/edicao do produto (`RecipeForm.tsx`)
- A descricao aparece no dialog de detalhes do produto no Cardapio publico e no Cardapio interno (Orders)

### 2. Seletor de modo de venda (Fatia ou Inteiro) no dialog de pedido
Quando o produto tem `sells_whole = true` E `sells_slice = true`, o dialog de detalhes mostra um seletor para o cliente/operador escolher:
- **Fatia** (com preco `slice_price`)
- **Inteiro** (com preco `whole_price`)

Quando so tem um modo ativo, o preco correspondente aparece automaticamente sem seletor.

O preco, subtotal e item no carrinho refletem a escolha (fatia ou inteiro).

## Detalhes Tecnicos

### Migration SQL
```sql
ALTER TABLE recipes ADD COLUMN description text;
```

### Arquivo: `src/components/recipes/RecipeForm.tsx`
- Adicionar campo `description` ao schema zod (string opcional, max 500 chars)
- Adicionar textarea "Descricao do Produto" no formulario, abaixo do nome
- Incluir `description` no payload de criacao/atualizacao

### Arquivo: `src/integrations/supabase/types.ts`
- Sera regenerado automaticamente com o novo campo `description`

### Arquivo: `src/pages/Cardapio.tsx`
- Atualizar o tipo `SelectedProduct` para incluir `description`, `sells_whole`, `sells_slice`, `whole_price`, `slice_price`
- No dialog de detalhes do produto:
  - Mostrar a descricao do produto abaixo do nome/categoria
  - Adicionar seletor de tipo (Fatia/Inteiro) quando ambos estao ativos
  - O preco e subtotal mudam conforme a selecao
- No `CartItem`, adicionar campo `unit_type` (slice/whole) para rastrear qual modo foi escolhido
- Ajustar `addFromDialog` e `quickAddToCart` para usar o preco correto baseado no modo

### Arquivo: `src/pages/Orders.tsx`
- No `NewOrderItem`, adicionar `unit_type` (slice/whole)
- No dialog de produto:
  - Mostrar descricao do produto
  - Adicionar seletor Fatia/Inteiro quando ambos modos estao disponiveis
  - Preco e subtotal refletem a selecao
- No `confirmProduct`, salvar `unit_type` e o preco correto
- No carrinho e sheet, mostrar se e "Fatia" ou "Inteiro" ao lado do nome

### Fluxo do usuario (Cardapio publico)
1. Cliente clica no bolo
2. Dialog abre mostrando foto, nome, descricao
3. Se o bolo vende fatia E inteiro: seletor com dois botoes (Fatia R$15 / Inteiro R$120)
4. Quantidade ajustavel (1, 2, 3...)
5. Observacoes
6. Botao "+ Adicionar -- R$ X" com o subtotal correto

### Fluxo do operador (Orders interno)
Mesma logica: ao clicar no produto, dialog mostra seletor de tipo quando ambos modos estao ativos, com precos diferenciados.
