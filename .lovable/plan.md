
# Produtos e Fotos na Visao de Funcionario

## Objetivo

Garantir que funcionarios tenham acesso a:
1. **Pagina de Produtos** (somente leitura -- sem botoes de criar/editar/excluir)
2. **Fotos e precos** nos cards de selecao de produto na pagina de Producao

## Alteracoes

### 1. Sidebar -- Tornar Produtos visivel para todos (`src/components/layout/AppSidebar.tsx`)

- Alterar o item `Produtos` de `ownerOnly: true` para `ownerOnly: false` no array `navGroups`
- Isso permite que funcionarios vejam e acessem a pagina de Produtos no menu lateral

### 2. Pagina Produtos -- Modo somente leitura (`src/pages/Recipes.tsx`)

- Importar `useAuth` e verificar `isOwner`
- Esconder o botao `<RecipeForm />` (novo produto) quando `!isOwner`
- No `RecipeCard`, esconder botoes de editar/excluir quando `!isOwner`
- Funcionario ve apenas o catalogo de produtos com fotos, precos e informacoes

### 3. RecipeCard -- Esconder acoes de edicao (`src/components/recipes/RecipeCard.tsx`)

- Receber prop `readOnly?: boolean`
- Quando `readOnly`, esconder botoes de editar e excluir no card
- Manter toda a informacao visual (foto, nome, preco, categoria)

### 4. Producao -- Mostrar foto e preco ao selecionar produto (`src/pages/Production.tsx`)

- Na secao "Nova Producao", apos selecionar o produto no Select, exibir:
  - Foto do produto (se existir `photo_url` na receita)
  - Preco de venda sugerido (`sale_price`)
- Isso aparece no bloco de "Previa da Producao" que ja existe, adicionando a miniatura do produto

### 5. RLS -- Nenhuma alteracao necessaria

- A tabela `recipes` ja possui policy `Authenticated can read active recipes` com `qual: (active = true)`
- Funcionarios ja conseguem ler receitas ativas pelo banco -- apenas a UI estava bloqueando

## Detalhes Tecnicos

- O `RecipeCard` recebera `readOnly` como prop, controlado pelo `isOwner` na pagina Recipes
- Na pagina Production, o objeto `recipe` ja contem `photo_url` e `sale_price` (vem do `useActiveRecipes` que faz `select('*')`)
- A foto sera exibida como miniatura (48x48) ao lado do nome do produto na previa
- Nenhuma migracao de banco de dados necessaria
