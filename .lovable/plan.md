
# Nova Animacao de Transicao de Pagina

## Problema Atual

A transicao atual e um simples fade-in com slide-up (`translateY(12px)`). Funcional, mas pouco expressiva -- nao transmite a sensacao de navegacao fluida entre secoes.

## Nova Animacao: Slide Horizontal + Fade

Criar uma transicao que simule navegacao lateral, como apps nativos mobile. O conteudo sai suavemente para a esquerda e o novo entra pela direita (ou vice-versa, dependendo da direcao de navegacao na bottom nav).

### Comportamento

1. Ao mudar de rota, o novo conteudo entra com um leve slide horizontal (20px) combinado com fade
2. A duracao sera 280ms -- rapida o suficiente para parecer responsiva, lenta o suficiente para ser percebida
3. Um leve scale (0.98 para 1.0) adiciona profundidade cinematica

## Detalhe Tecnico

### Arquivo 1: `tailwind.config.ts`

Adicionar novo keyframe `page-enter`:

```
"page-enter": {
  "0%": { opacity: "0", transform: "translateX(16px) scale(0.98)" },
  "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
}
```

E a animacao correspondente:
```
"page-enter": "page-enter 280ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
```

### Arquivo 2: `src/components/layout/PageTransition.tsx`

- Trocar a classe `animate-fade-in` por `animate-page-enter`
- Remover o override de `animationDuration` inline (a duracao fica no tailwind)
- Manter a logica de deteccao de mudanca de rota

2 arquivos, mudanca minima.
