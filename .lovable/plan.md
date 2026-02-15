

# Corrigir barra flutuante "Criar Pedido" para ficar fixa na tela

## Problema

A barra flutuante do carrinho usa `position: fixed`, mas ela **nao fica fixa na tela** ao rolar a pagina. Isso acontece porque o elemento `<main>` no `AppLayout` tem a classe `animate-fade-in`, que aplica um `transform: translateY(...)`. No CSS, qualquer elemento pai com `transform` cria um novo contexto de posicionamento, fazendo com que `fixed` se comporte como `absolute` -- ou seja, rola junto com o conteudo.

## Solucao

Mover o componente da barra flutuante para **fora** do fluxo do `<main>` com `transform`, usando um **React Portal** (`createPortal`) para renderizar a barra diretamente no `document.body`. Isso garante que ela fique realmente fixa no viewport, independente de qualquer `transform` nos elementos pais.

## Detalhes tecnicos

### Arquivo alterado: `src/pages/Orders.tsx`

1. Importar `createPortal` de `react-dom`
2. Envolver o bloco `{/* ===== FLOATING CART BAR ===== */}` com `createPortal(..., document.body)`
3. Nenhuma mudanca visual -- o CSS `fixed bottom-6` ja esta correto, so precisa escapar do contexto de `transform`

Essa mesma tecnica resolve o problema para qualquer outro componente `fixed` dentro de paginas que usam `AppLayout`.

