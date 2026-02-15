
# Redesign Completo da Sidebar do Carrinho

## O que muda

Transformar a sidebar do carrinho de um visual escuro/marrom para um design **predominantemente branco e limpo**, inspirado na imagem de referencia (estilo iFood/delivery moderno), com icones em caixas marrons com letras brancas nas secoes.

## Alteracoes em `src/pages/Cardapio.tsx` (linhas 364-528)

### 1. Fundo e estrutura do Sheet

- Remover gradiente escuro `linear-gradient(180deg, hsl(24 30% 14%), hsl(24 25% 8%))`
- Aplicar fundo **branco**: `bg-white` no SheetContent
- Borda esquerda sutil: `border-l border-gray-200`

### 2. Header "Meu Carrinho"

- Titulo "Meu Carrinho" em texto **preto/escuro** com subtitulo mostrando quantidade de itens (ex: "2 itens")
- Fonte: `'DM Sans'` bold
- Icone de carrinho ao lado do titulo em caixa marrom arredondada com fundo `bg-[#8B6914]` e icone branco

### 3. Secoes com badges marrons

Cada titulo de secao (ITENS DO CARRINHO, DADOS DO CLIENTE, COMO RECEBER) sera substituido por:
- Um badge/caixa com fundo marrom (`bg-[#6B4513]` ou similar) com texto branco uppercase
- Bordas arredondadas `rounded-lg`
- Padding `px-3 py-1.5`

### 4. Cards de itens do carrinho

- Fundo: `bg-white` com borda `border border-gray-200 rounded-xl`
- Shadow sutil: `shadow-sm`
- Thumbnail 56x56 com `rounded-lg`
- Nome do produto em **texto escuro** (`text-gray-900`)
- Preco em `text-[#8B6914]` (dourado/marrom)
- Botoes +/- com borda `border-gray-300`, texto escuro
- Botao de lixeira para remover item completamente

### 5. Inputs (Nome, Telefone, Endereco)

- Labels em `text-gray-600` com fonte `text-xs`
- Inputs com fundo `bg-gray-50`, borda `border-gray-200`, texto escuro
- Placeholder em `text-gray-400`
- Rounded `rounded-xl`

### 6. Delivery mode (Entrega/Retirada)

- Cards/pills com borda `border-gray-200`
- Estado ativo: borda `border-[#8B6914]` com fundo `bg-[#8B6914]/5` e texto/icone marrom
- Estado inativo: borda cinza claro, texto cinza
- Icones em tamanho maior dentro de caixa com cor

### 7. Footer (Total + CTA)

- Fundo branco com borda superior `border-t border-gray-100`
- "Total" em texto escuro, valor em `text-[#8B6914]` bold
- Subtotal e info de entrega (linhas separadas)
- Botao "Finalizar Pedido" com fundo marrom `bg-[#8B6914]` e texto branco, `rounded-full`
- Link "Limpar carrinho" discreto abaixo do botao

### 8. Cores e tipografia gerais

- Todos os textos no sidebar passam a usar cores escuras sobre fundo branco
- Labels de secao: `'DM Sans'` uppercase tracking-widest
- Valores monetarios: `font-mono` em cor marrom/dourado
- Remover qualquer referencia a `text-foreground`, `text-muted-foreground`, `bg-secondary` dentro do Sheet (usar cores fixas para garantir contraste no fundo branco)

### Resultado visual esperado

```text
+----------------------------------+
| [icone] Meu Carrinho        [X] |
|         2 itens                  |
+----------------------------------+
|                                  |
| [ITENS DO CARRINHO] <- badge    |
|                       marrom    |
| +------------------------------+|
| | [img] Croissant               ||
| |       R$ 4,50                 ||
| |       [-] 1 [+]         [lixo]||
| +------------------------------+|
|                                  |
| [RESUMO DO PEDIDO] <- badge    |
|                                  |
| +------------+ +------------+   |
| | Entrega    | | Retirada   |   |
| +------------+ +------------+   |
|                                  |
| [DADOS DO CLIENTE]              |
| Nome *  [________________]      |
| Tel     [________________]      |
|                                  |
+----------------------------------+
| Total          R$ 12,51         |
| [=== Finalizar Pedido ===]      |
|     Limpar carrinho              |
+----------------------------------+
```

### Arquivo alterado:
- `src/pages/Cardapio.tsx`
