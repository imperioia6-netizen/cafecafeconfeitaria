
# Animacao de Carregamento na Transicao de Pagina

## Conceito

Ao trocar de pagina, em vez de um simples fade/slide, mostrar uma barra de progresso fina no topo da tela (estilo NProgress/YouTube) com um brilho dourado. Ela aparece rapido, avanca ate ~80%, e completa ao carregar a nova pagina. Isso da a sensacao de "carregamento real" e polimento profissional.

## Comportamento

1. Usuario clica em um item da navbar
2. Uma barra fina dourada aparece no topo da tela e avanca progressivamente
3. Apos ~400ms (tempo da transicao), a barra completa ate 100% e desaparece com fade
4. O conteudo da nova pagina aparece normalmente

## Detalhe Tecnico

### Arquivo: `src/components/layout/PageTransition.tsx`

Reescrever o componente para incluir:

- Uma barra de progresso fixa no topo (`position: fixed`, `top: 0`, `z-50`)
- Altura de 2-3px com cor dourada (`hsl(36 70% 50%)`) e glow sutil
- Logica de progresso simulado: ao detectar mudanca de rota, a barra anima de 0% ate 80% rapidamente (~200ms), depois completa ate 100% e desaparece (~150ms)
- O conteudo continua renderizando normalmente abaixo (sem bloqueio)
- Usar CSS transitions para a largura da barra e opacity para o fade-out

### Arquivo: `tailwind.config.ts`

Adicionar keyframe `progress-bar` para a animacao da barra:

```
"progress-bar": {
  "0%": { width: "0%", opacity: "1" },
  "80%": { width: "80%", opacity: "1" },
  "100%": { width: "100%", opacity: "0" },
}
```

### Arquivo: `src/index.css`

Adicionar um efeito shimmer/glow no pseudo-elemento da barra para dar profundidade visual -- um brilho que percorre a barra durante o carregamento.

### Resultado Visual

- Barra fina dourada no topo, com brilho, que avanca e desaparece
- Sem skeleton, sem bloqueio de conteudo
- Estilo similar ao YouTube/GitHub -- premium e sutil
- Combina com a estetica dourada/marrom do app

3 arquivos modificados.
