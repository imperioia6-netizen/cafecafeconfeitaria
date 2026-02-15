

# Transicao Direta com Conteudo Surgindo (Sem Skeleton)

## Problema

Ao navegar entre paginas, aparece um skeleton loader generico em vez do conteudo real surgindo de forma animada. O usuario quer ver os proprios cards/elementos da pagina aparecendo com animacao, como um app nativo.

## Solucao

Remover o skeleton loader intermediario e fazer uma transicao direta: o conteudo antigo sai rapidamente e o novo conteudo entra com fade-in + slide-up suave. O efeito final e os quadros/cards da pagina "surgindo" naturalmente.

## Como vai funcionar

1. Usuario clica em uma opcao da nav
2. Conteudo atual desaparece instantaneamente
3. Novo conteudo entra com fade-in + translateY (de baixo para cima) em ~300ms
4. Sem skeleton, sem loading bar -- transicao limpa e direta

## Detalhes Tecnicos

### Arquivo: `src/components/layout/PageTransition.tsx`

Simplificar o componente removendo os estados `exiting` e `loading` com skeleton. Usar apenas dois estados:

- **`entering`**: novo conteudo aparece com animacao CSS (opacity 0 -> 1, translateY 8px -> 0)
- **`idle`**: conteudo visivel normalmente

Ao detectar mudanca de rota via `useLocation()`, trocar imediatamente o conteudo e aplicar a classe de animacao `animate-fade-in` por ~300ms.

Remover completamente o componente `SkeletonLoader` interno.

```text
[Click] -> entering (swap + fade-in 300ms) -> idle
```

Resultado: transicao instantanea com os proprios elementos da pagina surgindo suavemente, sem intermediario artificial.

| Arquivo | Acao |
|---|---|
| `src/components/layout/PageTransition.tsx` | Simplificar para transicao direta sem skeleton |

1 arquivo, logica mais simples.

