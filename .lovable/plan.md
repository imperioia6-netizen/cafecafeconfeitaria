

# Banner da Logo no Topo do Cardapio Digital

## Objetivo

Adicionar a imagem da logo "Cafe e Cafe Confeitaria" como um banner fixo no topo da pagina publica do cardapio (`/cardapio`), acima do header atual.

## Alteracoes

### 1. Copiar a imagem para o projeto

Copiar o arquivo enviado para `src/assets/banner-cardapio.png` para que seja importado como modulo ES6 no componente.

### 2. `src/pages/Cardapio.tsx`

- Importar a imagem: `import bannerImg from '@/assets/banner-cardapio.png'`
- Adicionar uma secao de banner **antes do header sticky**, com fundo preto e a imagem centralizada
- A imagem tera largura maxima controlada (~280px mobile, ~400px desktop) e sera renderizada dentro de um container com `bg-black` para manter a estetica original da logo
- O banner **nao sera sticky** -- ficara fixo no topo da pagina e rolara junto com o conteudo (o header com busca continuara sticky logo abaixo)

### Estrutura visual resultante:

```text
[======= BANNER LOGO (fundo preto, logo centralizada) =======]
[== HEADER STICKY (busca + carrinho + avatar) ================]
[== CATEGORIAS STICKY ========================================]
[== GRID DE PRODUTOS =========================================]
```

### Estilo do banner:

- Fundo: `bg-black` para combinar com o fundo da imagem da logo
- Padding vertical confortavel (py-6 mobile, py-8 desktop)
- Imagem centralizada com `mx-auto`, max-width responsivo
- Borda inferior sutil com gradiente dourado para transicao elegante

### Arquivo alterado:
- `src/pages/Cardapio.tsx`

### Arquivo criado:
- `src/assets/banner-cardapio.png` (copia da imagem enviada)

