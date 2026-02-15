

# Corrigir Floating Cart Bar sobrepondo a Bottom Nav no Mobile

## Problema

No Cardapio, o botao flutuante do carrinho ("Criar Pedido") usa `fixed bottom-0`, ficando exatamente na mesma posicao da bottom navigation bar. Os dois elementos se sobrepoem, tornando ambos inutilizaveis.

## Solucao

Mover a floating cart bar para cima no mobile, adicionando `bottom-16` (64px = altura da bottom nav) quando estiver em tela mobile, e manter `bottom-0` no desktop.

## Detalhes Tecnicos

### Arquivo: `src/pages/Cardapio.tsx` (linha 526)

**De:**
```
className="fixed bottom-0 left-0 right-0 z-50 ..."
```

**Para:**
```
className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 ..."
```

- `bottom-16` no mobile: empurra a barra 64px acima, ficando logo acima da bottom nav
- `md:bottom-0` no desktop: mantém no fundo da tela (sem bottom nav no desktop)
- `z-40` em vez de `z-50`: a bottom nav fica por cima (z-50), a cart bar logo abaixo (z-40), sem conflito visual

Apenas 1 arquivo modificado, 1 linha alterada.

