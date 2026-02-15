

# Corrigir Botao "Criar Pedido" Atras da Navbar Mobile

## Problema

O footer do Sheet do carrinho (Total + botao "Criar Pedido") fica atras da barra de navegacao inferior (MobileBottomNav, 80px de altura), tornando impossivel tocar no botao no mobile.

## Solucao

### Arquivo: `src/pages/Orders.tsx`

Na linha 932, o footer do Sheet usa apenas `safe-area-bottom` que nao e suficiente. Adicionar padding inferior extra para compensar a altura da navbar mobile (80px):

**De:**
```
<div className="p-5 pt-3 border-t border-border/20 space-y-3 safe-area-bottom">
```

**Para:**
```
<div className="p-5 pt-3 pb-28 md:pb-5 border-t border-border/20 space-y-3">
```

O `pb-28` (112px) garante espaco suficiente abaixo do botao para nao ser coberto pela MobileBottomNav de 80px, e `md:pb-5` restaura o padding normal no desktop.

