

# Produtos: Barra de pesquisa + Indicação de foto

## Alterações

### 1. `src/pages/Recipes.tsx` — Barra de pesquisa
- Adicionar estado `search` e um `Input` com ícone `Search` entre o header e as tabs.
- Filtrar `filtered` por nome (case-insensitive) antes de renderizar os cards.
- Os KPIs refletem a lista já filtrada pela pesquisa.

### 2. `src/components/recipes/RecipeCard.tsx` — Exibir foto do produto
- Adicionar uma seção de imagem no topo do card:
  - Se `recipe.photo_url` existir: exibir a imagem com `object-cover` em aspecto 16/9.
  - Se não existir: exibir placeholder com ícone `ImageOff` e badge "Sem foto" para diferenciar visualmente.
- Mover o conteúdo atual para abaixo da imagem.

## Arquivos editados
- `src/pages/Recipes.tsx`
- `src/components/recipes/RecipeCard.tsx`

