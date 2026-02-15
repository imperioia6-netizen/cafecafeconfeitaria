

# Esconder a Barra de Scroll Vertical

## O que muda

Adicionar CSS para ocultar a barra de rolagem vertical da pagina do cardapio, mantendo a funcionalidade de scroll por toque/mouse.

## Alteracao em `src/pages/Cardapio.tsx`

Na tag `<style>` que ja existe no final do componente (que ja esconde scrollbar horizontal do `.no-scrollbar`), adicionar regras para esconder o scrollbar do `body` ou do container principal da pagina:

- Expandir o bloco `<style>` existente para incluir regras que escondem a barra de rolagem vertical da pagina inteira
- Usar `overflow-y: scroll` com `scrollbar-width: none` (Firefox) e `::-webkit-scrollbar { display: none }` (Chrome/Safari)
- Aplicar no container principal ou via classe no `div` raiz do componente

### Arquivo alterado:
- `src/pages/Cardapio.tsx` -- expandir bloco `<style>` para esconder scrollbar vertical

