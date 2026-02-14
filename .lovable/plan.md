
# Renomear "Receitas" para "Produtos"

## Resumo

Trocar todas as ocorrencias de "Receitas" para "Produtos" na interface do usuario. As rotas e nomes de arquivos internos permanecem iguais para evitar quebras.

## Alteracoes

### 4 arquivos afetados

1. **`src/components/layout/AppSidebar.tsx`** — Menu lateral: `'Receitas'` vira `'Produtos'`

2. **`src/pages/Recipes.tsx`** — Titulo da pagina: `'Receitas'` vira `'Produtos'`

3. **`src/pages/Index.tsx`** — Card de atalho no dashboard: `'Receitas'` vira `'Produtos'`

4. **`src/pages/Production.tsx`** — Mensagem "Cadastre receitas primeiro" vira "Cadastre produtos primeiro"

### O que NAO muda

- Nomes de arquivos (`Recipes.tsx`, `useRecipes.ts`, etc.) permanecem iguais — sao internos e nao aparecem para o usuario
- Rotas (`/recipes`) permanecem iguais
- Tabela do banco (`recipes`) permanece igual
