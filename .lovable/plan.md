
# Funcionalidade Mobile Completa -- Arrastar, Clicar, Tocar

## Problemas Identificados

### 1. Botoes invisiveis no mobile (dependem de hover)
- **Sales.tsx (linha 136)**: O botao "+" nos produtos tem `opacity-0 group-hover:opacity-100` -- no mobile nao aparece nunca, pois nao existe hover em telas touch
- **Orders.tsx (linha 564)**: O botao "X" para remover item do pedido tem `opacity-0 group-hover/item:opacity-100` -- invisivel no mobile

### 2. Alvos de toque pequenos demais
- **EstoqueTab.tsx**: Botoes de +/- do estoque com `size="sm"` podem ser dificeis de tocar
- **Sales.tsx**: Botoes de +/- no carrinho com `h-7 w-7` sao muito pequenos para dedos

### 3. Scroll horizontal dos filtros/tabs
- **EstoqueTab.tsx**: Os filtros de estoque nao tem scroll horizontal mobile (`flex-wrap` pode quebrar layout)
- **Inventory.tsx**: TabsList ja tem `mobile-tabs` e `overflow-x-auto` (ok)

### 4. Elementos sobrepostos pela navbar inferior
- **Sales.tsx**: O botao "Finalizar Venda" pode ficar parcialmente coberto pela bottom nav no mobile. O `pb-24` no layout ajuda, mas a pagina Sales nao adiciona padding extra
- **Orders.tsx**: O floating cart bar ja esta posicionado com `bottom-20` (ok)

### 5. Interacoes de swipe ausentes
- Nenhuma pagina implementa swipe para deletar ou navegar -- oportunidade de melhoria para cards de pedidos

## Solucao

### Arquivo 1: `src/pages/Sales.tsx`
- Tornar o icone "+" nos produtos sempre visivel no mobile (remover `opacity-0 group-hover:opacity-100` e usar `md:opacity-0 md:group-hover:opacity-100`)
- Aumentar area de toque dos botoes +/- do carrinho de `h-7 w-7` para `h-9 w-9` no mobile
- Adicionar `pb-28` no wrapper para evitar sobreposicao com bottom nav

### Arquivo 2: `src/pages/Orders.tsx`
- Tornar o botao "X" de remover item sempre visivel no mobile (`md:opacity-0 md:group-hover/item:opacity-100` em vez de `opacity-0 group-hover/item:opacity-100`)
- Garantir que os botoes de acao dos pedidos (Cancelar/Finalizar) tenham area de toque adequada

### Arquivo 3: `src/components/inventory/EstoqueTab.tsx`
- Adicionar `overflow-x-auto mobile-tabs` nos filtros para permitir scroll horizontal
- Garantir que botoes +/- tenham `min-h-[44px]` para atender guidelines de acessibilidade touch (44x44px)

### Arquivo 4: `src/pages/Production.tsx`
- Aumentar os botoes de Editar/Deletar de `h-8 w-8` para `h-10 w-10` no mobile para melhor toque
- Garantir area de toque minima nos botoes

### Arquivo 5: `src/index.css`
- Adicionar utilitario CSS `touch-action: manipulation` global para eliminar delay de 300ms no tap em dispositivos moveis
- Adicionar `-webkit-tap-highlight-color: transparent` para remover highlight azul no iOS

## Detalhe Tecnico

| Problema | Arquivo | Linha | Fix |
|---|---|---|---|
| Botao + invisivel | Sales.tsx | 136 | `opacity-100 md:opacity-0 md:group-hover:opacity-100` |
| Botao X invisivel | Orders.tsx | 564 | `opacity-100 md:opacity-0 md:group-hover/item:opacity-100` |
| Touch targets pequenos | Sales.tsx | 174,179 | `h-9 w-9 md:h-7 md:w-7` |
| Touch targets pequenos | Production.tsx | 206-209 | `h-10 w-10 md:h-8 md:w-8` |
| Filtros sem scroll | EstoqueTab.tsx | 85 | Adicionar `overflow-x-auto no-scrollbar mobile-tabs` |
| Botoes estoque pequenos | EstoqueTab.tsx | 206-210 | `min-h-[44px]` nos botoes |
| Tap delay 300ms | index.css | global | `touch-action: manipulation` |
| Highlight azul iOS | index.css | global | `-webkit-tap-highlight-color: transparent` |
| Padding faltando | Sales.tsx | 84 | Adicionar `pb-28` para espaco da bottom nav |

5 arquivos modificados. Foco exclusivo em funcionalidade touch/mobile.
