

# Melhorar Design dos Cards do Cardapio

## O que muda

Redesign dos cards de produto na pagina `/cardapio` para um visual mais limpo e elegante, com tipografia melhorada.

## Alteracoes em `src/pages/Cardapio.tsx`

### Cards de produto (linhas 266-316)

- Trocar `card-cinematic` por classes diretas com fundo creme/bege claro (`bg-card`), borda sutil e `rounded-2xl` para cantos mais suaves
- Aumentar `aspect-ratio` da imagem para `[4/3]` com `rounded-t-2xl` na imagem
- Nome do produto: trocar de `text-sm font-semibold` para `text-[15px] font-medium` com `font-family: 'DM Sans'` (ja importada no projeto) para leitura mais limpa
- Preco: trocar `font-mono-numbers` (JetBrains Mono) para `'DM Sans'` com `font-semibold tracking-wide text-base` -- visual mais moderno e legivel, sem monospace
- Botao de adicionar (+): manter circular com `bg-accent` mas aumentar levemente para `w-9 h-9`
- Adicionar `shadow-sm hover:shadow-md` para elevacao suave no hover em vez do `translateY` atual
- Padding interno do conteudo: `p-4` em vez de `p-3`

### Resultado visual esperado:

```text
+---------------------------+
|                           |
|   [Foto do produto]      |
|   (rounded-t, aspect 4/3)|
|                           |
+---------------------------+
|  Nome do Produto          |
|                           |
|  R$ 115,00          (+)   |
+---------------------------+
```

- Fonte do nome: DM Sans, peso medio, tamanho 15px
- Fonte do preco: DM Sans, peso semibold, tracking mais aberto
- Card: fundo claro, borda sutil, sombra leve, cantos arredondados 2xl

### Arquivo alterado:
- `src/pages/Cardapio.tsx` -- redesign dos cards e tipografia
