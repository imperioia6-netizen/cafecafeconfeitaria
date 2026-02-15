

# Cardapio Digital (Visao do Cliente)

## Objetivo

Criar uma pagina publica de cardapio digital que o cliente acessa para visualizar os produtos disponiveis -- sem login, sem sidebar, sem funcionalidades de gestao. Apenas um catalogo bonito e navegavel, inspirado no layout do iFood (imagem de referencia).

## Nova Pagina: `/cardapio`

Uma pagina standalone (sem AppLayout, sem autenticacao) contendo:

### Header fixo
- Logo/nome do estabelecimento no canto esquerdo
- Barra de busca centralizada
- Visual limpo, fundo branco/claro

### Categorias
- Pills horizontais com emojis (Todas, Bebidas, Lanches, Doces, Padaria, etc.)
- Scroll horizontal em mobile
- Estilo semelhante a imagem de referencia (pills arredondadas com icone + texto)

### Grid de Produtos
- Cards grandes com:
  - Foto do produto (aspecto 1:1 ou 4:3, arredondado)
  - Nome do produto
  - Preco em destaque (R$ XX,XX)
  - Botao "Adicionar" vermelho (visual, sem funcionalidade de carrinho -- apenas cardapio)
- Grid responsivo: 2 colunas mobile, 3-4 colunas desktop, 5 colunas telas grandes
- Apenas produtos ativos (`active = true`) sao exibidos

### Diferenca da pagina de Pedidos
- **Sem login** -- rota publica
- **Sem sidebar/header** do sistema
- **Sem carrinho** -- e apenas visualizacao do cardapio
- **Sem gestao de pedidos** -- sem comanda, mesa, finalizacao
- Dados vem de `recipes` (produtos ativos), nao de `inventory`

## Alteracoes

### Novo arquivo: `src/pages/Cardapio.tsx`
- Pagina standalone sem AppLayout
- Usa `useActiveRecipes()` para listar produtos ativos
- Filtro por categoria e busca por nome
- Layout inspirado na referencia iFood: header limpo, pills de categoria, grid de cards com fotos grandes e botao "Adicionar"
- Tema claro (fundo branco) independente do tema do sistema
- Responsivo mobile-first

### `src/App.tsx`
- Adicionar rota `/cardapio` apontando para a nova pagina
- Rota fora do AppLayout (sem autenticacao)

## Detalhes Tecnicos

- A pagina nao usa `AppLayout` (que redireciona para `/auth` se nao logado)
- Usa `useActiveRecipes()` que ja existe e faz `select('*').eq('active', true)`
- Nao precisa de RLS especial -- a policy `Authenticated can read active recipes` ja existe, mas precisaremos garantir que usuarios anonimos tambem possam ler (ou usar `anon` key que ja esta configurada)
- O botao "Adicionar" sera visual apenas (placeholder para futura funcionalidade de pedido online)
- Cores do botao: vermelho solido (#DC2626) seguindo a referencia iFood
- Tipografia: sans-serif limpa para o cardapio publico

