

# Corrigir Layout Mobile do Carrinho e Pedidos

## Problemas Identificados

1. O Sheet do carrinho ocupa apenas 75% da largura no mobile (classe padrao `w-3/4`), cortando textos e precos
2. O preco dos itens fica cortado/truncado por falta de espaco
3. A barra flutuante do carrinho aparece por tras do Sheet aberto
4. Os botoes "Editar" e "Remover" dentro do Sheet sao muito pequenos para toque mobile
5. O Sheet nao usa largura total no mobile como deveria em um app mobile-first

## Solucao

### Arquivo: `src/pages/Orders.tsx`

**1. Sheet do carrinho com largura total no mobile**

Alterar a classe do `SheetContent` (linha 825) para ocupar 100% da largura no mobile:
- De: `className="sm:max-w-md flex flex-col p-0"`
- Para: `className="w-full sm:max-w-md flex flex-col p-0"`

**2. Esconder barra flutuante quando o Sheet esta aberto**

Na condicao do portal da barra flutuante (linha 675), adicionar `&& !cartSheetOpen` para que a barra desapareca quando o Sheet esta visivel, evitando sobreposicao.

**3. Melhorar layout dos itens no Sheet para mobile**

- Itens do carrinho (linhas 844-889): reorganizar para que o preco fique abaixo do nome em vez de ao lado quando o espaco e limitado
- Trocar `justify-between` por layout empilhado no mobile
- Aumentar alvos de toque dos botoes Editar/Remover para min 44px de altura
- Usar `flex-wrap` onde necessario para evitar truncamento

**4. Ajustar footer do Sheet**

- Garantir que o total e o botao "Criar Pedido" / "Adicionar ao Pedido" tenham padding seguro para evitar area do gesto do iOS (safe-area-inset)
- Adicionar `pb-safe` ou padding extra no footer

**5. Secao "Dados do Pedido" mais compacta no mobile**

- Os inputs do grid 2x2 (linhas 902-926) ficam com labels menores
- Garantir que o Select de canal nao quebre o layout

### Detalhes Tecnicos

- `SheetContent`: adicionar `w-full` para override do `w-3/4` padrao no mobile
- Barra flutuante: condicao muda de `cart.length > 0` para `cart.length > 0 && !cartSheetOpen`
- Botoes Editar/Remover no Sheet: `h-7` sobe para `h-9` com `min-h-[44px]` para compliance de toque
- Item card no Sheet: preco move para linha separada em telas pequenas usando `flex-col` no container principal
- Footer do Sheet: adicionar `pb-[env(safe-area-inset-bottom)]` para iPhones com barra home

