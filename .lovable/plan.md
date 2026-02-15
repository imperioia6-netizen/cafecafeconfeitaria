

# Separacao por Precificacao na Aba de Produtos

## Objetivo

Agrupar os produtos (receitas) na pagina `/recipes` por **faixas de precificacao**, permitindo ao administrador visualizar rapidamente quais produtos estao em cada faixa de preco e margem.

## Alteracoes

### `src/pages/Recipes.tsx`

Adicionar um sistema de **abas ou filtros por faixa de precificacao** acima do grid de produtos:

1. **Tabs de precificacao** usando o componente `Tabs` ja disponivel:
   - **Todos** -- mostra todos os produtos (padrao)
   - **Margem Alta** (acima de 50%) -- cor verde
   - **Margem Media** (entre 30% e 50%) -- cor amarela/dourada
   - **Margem Baixa** (abaixo de 30%) -- cor vermelha
   - **Sem Precificacao** -- produtos com preco ou custo zerado

2. A filtragem sera feita no frontend com `useMemo`, calculando a margem de cada receita: `((sale_price - direct_cost) / sale_price) * 100`

3. Exibir um **resumo de KPIs** por aba selecionada:
   - Quantidade de produtos na faixa
   - Preco medio
   - Margem media

### `src/components/recipes/RecipeCard.tsx`

Sem alteracoes significativas -- o card ja exibe Preco, Custo e Margem conforme o screenshot.

## Detalhes Tecnicos

### Logica de classificacao (dentro de Recipes.tsx):

```text
Para cada receita:
  cost = direct_cost || 0
  price = sale_price
  margin = price > 0 ? ((price - cost) / price) * 100 : -1

  Se margin < 0 ou price == 0  -> "sem_precificacao"
  Se margin < 30              -> "margem_baixa"
  Se margin >= 30 e < 50      -> "margem_media"
  Se margin >= 50             -> "margem_alta"
```

### Estrutura visual:

```text
[Todos (15)] [Margem Alta (8)] [Margem Media (4)] [Margem Baixa (2)] [Sem Preco (1)]

  Produtos: 8  |  Preco Medio: R$ 137,00  |  Margem Media: 78%

  [Card] [Card] [Card]
  [Card] [Card] [Card]
```

### Arquivos alterados:
- `src/pages/Recipes.tsx` -- adicionar Tabs de precificacao, logica de filtragem por margem e KPIs resumidos

