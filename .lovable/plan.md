

# Corrigir Barra Flutuante do Carrinho na Pagina de Pedidos

## Problema

Na pagina `/orders`, a barra flutuante do carrinho (com "Criar Pedido", "Ver", total) usa `fixed bottom-6`, ficando em cima da bottom navigation bar no mobile. Isso e visivel na segunda imagem enviada.

## Solucao

Ajustar o posicionamento da barra flutuante para subir acima da bottom nav no mobile, mantendo a posicao atual no desktop.

## Detalhes Tecnicos

### Arquivo: `src/pages/Orders.tsx` (linha 632)

**De:**
```
className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] ..."
```

**Para:**
```
className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 ..."
```

- `bottom-20` no mobile: empurra a barra 80px acima (64px da nav + 16px de respiro)
- `md:bottom-6` no desktop: mantem a posicao original (sem bottom nav no desktop)
- `z-40` em vez de `z-[9999]`: evita conflito com a bottom nav (z-50), mantendo hierarquia correta

Apenas 1 arquivo, 1 linha alterada.

