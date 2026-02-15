

# Redesign Premium da Bottom Navigation Mobile

## Objetivo

Elevar a navbar inferior de "funcional" para "premium" -- inspirada em apps de alto nivel como Apple Music, Spotify e apps bancarios de luxo. A imagem mostra o estado atual: a barra esta ok mas falta profundidade, refinamento e presenca visual.

## Mudancas Visuais

### 1. Indicador Ativo: Pill Glow em vez de barra fina
- Substituir a barra de 2px no topo por um **pill luminoso** atras do icone ativo (estilo iOS 18 / Material You)
- O pill tera um gradiente dourado sutil com glow radial, criando profundidade
- Transicao suave com `transition-all duration-500` para o pill "flutuar" entre itens

### 2. Icones com mais presenca
- Icones ativos: **24px** com stroke 2.2 (mais equilibrado que 2.5)
- Icones inativos: **20px** com stroke 1.6 (mais leves, mais contraste com ativo)
- Icone ativo ganha micro-animacao de **bounce** ao ser tocado (scale 0.85 -> 1.1 -> 1.0)

### 3. Background com mais profundidade
- Adicionar uma segunda camada de gradiente radial sutil centrada no item ativo
- A borda superior dourada fica mais pronunciada (0.5 opacity no centro em vez de 0.4)
- Sombra superior mais dramatica para separacao do conteudo

### 4. Tipografia refinada
- Labels: **10px** com letter-spacing `0.02em` para legibilidade
- Label ativo: peso 700 (bold) em vez de 600 para mais contraste hierarquico
- Label inativo: cor mais suave para nao competir com o ativo

### 5. Botao "Mais" diferenciado
- Icone "Mais" com 3 pontos em circulo (dots grid) em vez de reticencias horizontais
- Ou manter o MoreHorizontal mas com um container circular sutil

### 6. Safe area e altura
- Aumentar altura de 72px para 76px para mais respiro interno
- Melhorar gap entre icone e label para 6px

## Detalhe Tecnico

### Arquivo: `src/components/layout/MobileBottomNav.tsx`

Mudancas:
- **Indicador ativo**: trocar a `div` com `h-[2px]` no topo por um pill atras do icone com `rounded-[14px]`, background gradiente dourado com glow
- **Container do icone ativo**: expandir para `w-14 h-9` com `rounded-[14px]` e gradiente `linear-gradient(135deg, hsl(36 70% 50% / 0.15), hsl(36 80% 55% / 0.08))`
- **Sombra do pill ativo**: `box-shadow: 0 0 12px hsl(36 70% 50% / 0.2), 0 2px 8px hsl(36 70% 50% / 0.15)`
- **Tamanhos de icone**: ativo `h-6 w-6`, inativo `h-[18px] w-[18px]`
- **Stroke width**: ativo 2.2, inativo 1.5
- **Labels**: `text-[10px] tracking-wide`, ativo com `font-bold` e cor `hsl(36 80% 60%)`, inativo `hsl(36 15% 38%)`
- **Gap interno**: mudar `gap-1.5` para `gap-[6px]`
- **Altura do container**: de `72px` para `76px`
- **Background da nav**: gradiente mais rico com 3 stops e opacidade 0.98
- **Borda superior**: intensificar o pico central do gradiente para 0.5
- **Animacao de toque**: `active:scale-[0.85]` com `transition-transform duration-150` para feedback tatil mais expressivo

### Arquivo: `src/index.css`

Adicionar keyframe para micro-bounce do icone ativo:
```
@keyframes nav-icon-pop {
  0% { transform: scale(0.85); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```
E classe `.nav-icon-active` que aplica a animacao ao montar.

2 arquivos modificados. Resultado: uma bottom nav com presenca visual de app nativo premium.

