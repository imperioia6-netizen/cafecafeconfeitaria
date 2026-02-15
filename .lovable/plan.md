

# Esconder Barra de Scroll da Sidebar

## Problema

A barra de scroll branca aparece visivel dentro da sidebar (tanto desktop quanto mobile via Sheet), quebrando a estetica do menu lateral escuro.

## Solucao

### Arquivo: `src/components/layout/AppSidebar.tsx`

Na linha 90, adicionar a classe utilitaria `no-scrollbar` (ja definida no `index.css`) ao elemento `<nav>` que possui `overflow-y-auto`:

**De:**
```
overflow-y-auto py-5 px-3 space-y-6
```

**Para:**
```
overflow-y-auto no-scrollbar py-5 px-3 space-y-6
```

Isso mantem o scroll funcional (o usuario ainda pode rolar com o dedo ou mouse wheel) mas esconde a barra visual usando as propriedades CSS `scrollbar-width: none` e `::-webkit-scrollbar { display: none }`.

