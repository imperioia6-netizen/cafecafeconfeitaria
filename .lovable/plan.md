

# Correcao: Sidebar Abrindo/Fechando ao Clicar na Navbar

## Causa Raiz

O `MobileBottomNav` e o overlay do `Sheet` (sidebar mobile) usam o mesmo `z-index: 50`. Quando a sidebar esta aberta, o overlay do Sheet cobre toda a tela -- incluindo a area da navbar inferior. Ao clicar em um item da navbar:

1. O clique atinge primeiro o overlay do Sheet, fechando a sidebar
2. O clique tambem propaga para o botao da navbar por baixo
3. Se for o botao "Mais", a sidebar reabre imediatamente -- criando o efeito de abrir/fechar repetido

## Solucao

Duas mudancas cirurgicas:

### 1. `src/components/layout/MobileBottomNav.tsx`

Elevar o `z-index` da navbar para `z-[60]`, acima do overlay do Sheet (`z-50`). Isso garante que a navbar sempre fique por cima e receba cliques diretamente, sem interferencia do overlay.

```
z-50  -->  z-[60]
```

### 2. `src/components/layout/AppLayout.tsx`

Adicionar `e.stopPropagation()` no `onOpenMore` para evitar que o clique no "Mais" propague para elementos abaixo, e garantir que navegacao nos outros botoes feche a sidebar se estiver aberta.

Tambem mudar o `onOpenMore` para usar um toggle mais seguro:

```tsx
<MobileBottomNav onOpenMore={() => setSidebarOpen(true)} />
```

Permanece igual, pois o problema real e o z-index.

## Resultado

A navbar fica sempre acessivel por cima de qualquer overlay. Clicar nos itens navega normalmente sem interferir na sidebar. O botao "Mais" abre a sidebar sem conflito.

