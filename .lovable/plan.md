

# Corrigir Animacao de Transicao entre Paginas

## Problema

O componente `PageTransition` tem um bug: a prop `key={location.pathname}` forca o React a destruir e recriar o componente a cada mudanca de rota. Quando o componente e recriado, o `useRef(location.pathname)` inicializa com o pathname atual, entao a condicao `location.pathname !== prevPath.current` nunca e verdadeira. Resultado: a animacao nunca acontece.

## Solucao

Simplificar o componente removendo o `key` e o `useRef`, e usando o estado `entering` que inicia como `true` em cada montagem via efeito reativo ao pathname.

## Detalhe Tecnico

### Arquivo: `src/components/layout/PageTransition.tsx`

Duas opcoes para corrigir (usarei a mais simples):

Remover o `key` prop e manter a logica de deteccao de mudanca de rota com `useRef`. Quando a rota muda, setar `entering = true` por 400ms, aplicando a classe `animate-fade-in` que ja existe no Tailwind config (fade-in: opacity 0 -> 1 + translateY 12px -> 0, duracao 0.5s).

```text
Mudanca principal:
- Remover key={location.pathname} do div
- Manter useRef + useEffect para detectar mudanca
- Isso garante que o componente NAO remonta, e o ref preserva o path anterior
```

| Arquivo | Acao |
|---|---|
| `src/components/layout/PageTransition.tsx` | Remover key prop para corrigir bug da animacao |

1 arquivo, correcao minima.

