

# Transicao Suave entre Paginas

## Problema

Ao navegar entre paginas pela bottom nav ou sidebar, o conteudo muda abruptamente causando um "salto" visual desagradavel -- as dimensoes do layout anterior desaparecem e o novo conteudo surge sem transicao.

## Solucao

Criar um componente `PageTransition` que detecta mudancas de rota e aplica uma animacao de fade-out/fade-in rapida (150ms), dando a sensacao de um app nativo e fluido.

## Como vai funcionar

1. Quando o usuario clica em uma opcao de navegacao, o conteudo atual faz um **fade-out rapido** (opacity 1 para 0 + leve translate-y)
2. Um **skeleton loader** minimo aparece por ~150ms (apenas um shimmer sutil, nao um loading pesado)
3. O novo conteudo entra com **fade-in suave** (opacity 0 para 1)

O resultado e uma transicao imperceptivelmente rapida, mas que elimina completamente o salto visual.

## Detalhes Tecnicos

### 1. Novo componente: `src/components/layout/PageTransition.tsx`

- Usa `useLocation()` do react-router para detectar mudanca de rota
- Ao mudar a rota, alterna estado `transitioning` para `true` por ~120ms
- Durante a transicao: aplica `opacity-0 translate-y-1` no conteudo
- Depois: `opacity-100 translate-y-0` com `transition-all duration-200`
- Nao usa nenhuma lib externa, apenas CSS transitions

```text
Fluxo:
[Click nav] -> [fade-out 100ms] -> [mount nova pagina] -> [fade-in 150ms]
```

### 2. Modificar: `src/components/layout/AppLayout.tsx`

- Envolver `{children}` com o componente `PageTransition`
- Remover o `animate-fade-in` atual do `<main>` (conflita com a nova transicao)

### 3. Modificar: `src/pages/Cardapio.tsx`

- O Cardapio nao usa AppLayout, entao adicionar o mesmo efeito de fade-in no mount

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/layout/PageTransition.tsx` | Criar (novo componente) |
| `src/components/layout/AppLayout.tsx` | Envolver children com PageTransition, remover animate-fade-in duplicado |
| `src/pages/Cardapio.tsx` | Adicionar fade-in no mount |

Total: 1 arquivo novo, 2 arquivos modificados. Solucao leve, sem dependencias extras.

