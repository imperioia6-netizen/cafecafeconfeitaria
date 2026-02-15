

# Animacao de Carregamento nas Transicoes de Pagina

## Problema

Ao clicar nas opcoes da bottom nav (Dashboard, Pedidos, Vendas, Estoque, Mais), a transicao atual e apenas um fade rapido de 120ms que quase nao se percebe, resultando em redirecionamentos "secos" e visualmente feios.

## Solucao

Melhorar o `PageTransition` para mostrar um skeleton/shimmer animado durante a transicao, dando a sensacao de um app nativo carregando o conteudo de forma elegante.

## Como vai funcionar

1. Usuario clica em uma opcao da nav
2. Conteudo atual faz fade-out rapido (150ms)
3. Aparece um skeleton loader com shimmer animado (3 blocos pulsando) por ~300ms
4. Novo conteudo entra com fade-in suave

O resultado e uma transicao visivelmente profissional sem ser lenta.

## Detalhes Tecnicos

### Arquivo: `src/components/layout/PageTransition.tsx`

Reescrever o componente com 3 estados em vez de 2:

1. **`idle`** - conteudo visivel normalmente
2. **`exiting`** - fade-out do conteudo atual (~150ms)
3. **`loading`** - skeleton shimmer visivel (~250ms)
4. Volta para `idle` com novo conteudo (fade-in via CSS)

O skeleton loader sera composto por:
- 1 bloco largo no topo (simula titulo da pagina)
- 2 blocos menores abaixo (simulam cards/conteudo)
- Todos com `animate-pulse` do Tailwind e cantos arredondados

Fluxo de estados:

```text
[Click] -> exiting (150ms) -> loading (250ms) -> idle (fade-in 200ms)
```

Tempo total: ~600ms -- rapido o suficiente para parecer fluido, lento o suficiente para ser percebido como "carregamento real".

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/layout/PageTransition.tsx` | Reescrever com skeleton loader intermediario |

Total: 1 arquivo modificado. Sem dependencias novas.

