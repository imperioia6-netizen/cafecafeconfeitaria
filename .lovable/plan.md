
# Navbar Mobile Cinematografica -- Nivel Premium

## Visao Geral

Elevar a barra de navegacao inferior para um nivel cinematografico de alto impacto, com efeitos de profundidade, iluminacao e micro-interacoes que criam uma experiencia de app nativo premium.

## Mudancas Visuais

### Fundo e Estrutura
- Fundo mais profundo e rico com camadas de gradiente (3 camadas sobrepostas para efeito de vidro escuro)
- Borda superior com efeito de "luz dourada" mais pronunciado -- duas linhas (uma fina intensa + uma difusa abaixo) criando ilusao de luz incidindo de cima
- Sombra superior mais dramatica com multiplas camadas para efeito de flutuacao

### Icone Ativo -- Efeito "Spotlight"
- Pill do icone ativo mais largo e com gradiente radial dourado mais vibrante
- Adicionar um "spotlight glow" abaixo do icone ativo -- um circulo de luz difusa que simula uma lanterna apontando de cima
- Icone ativo com brilho mais forte (drop-shadow duplo) e leve animacao de pulse sutil no glow
- Indicador ativo: um pequeno dot/barra dourada acima do icone ativo (tipo um "notch" de luz)

### Icones Inativos
- Cor mais sutil e apagada para maior contraste com o ativo
- Transicao suave ao mudar de estado

### Barra Superior Luminosa
- Substituir a linha simples de 1px por uma composicao de 2 elementos:
  - Linha fina (1px) com gradiente dourado concentrado no centro
  - Faixa difusa (4px) com blur abaixo, criando efeito de "luz vazando" pela borda

### Micro-detalhes
- Adicionar uma leve textura de noise no fundo via pseudo-elemento CSS para profundidade
- Aumentar a altura para ~80px para dar mais respiro e presenca

## Detalhes Tecnicos

### Arquivo: `src/components/layout/MobileBottomNav.tsx`

**Estrutura atualizada:**
- Adicionar div para o "glow bar" no topo (duas camadas de luz)
- Adicionar div de "spotlight" posicionada dinamicamente sob o item ativo
- Adicionar dot/notch indicador acima do icone ativo
- Ajustar todas as cores, sombras e tamanhos conforme descrito

**Estilos inline atualizados:**
- Background: gradiente mais escuro e rico com 3 stops
- Box-shadow: 3 camadas de sombra para profundidade
- Pill ativo: gradiente radial dourado + box-shadow com glow mais intenso + borda dourada sutil
- Icone ativo: drop-shadow duplo para brilho cinematografico
- Label ativo: text-shadow dourado sutil

### Arquivo: `src/index.css`

- Adicionar keyframe `spotlight-pulse` para animacao sutil do glow do item ativo (opacidade oscilando entre 0.6 e 1)
- Adicionar classe `.nav-spotlight` com a animacao

## Resultado

Uma barra de navegacao que parece flutuar sobre a interface com iluminacao cinematografica, onde o item ativo se destaca como se tivesse um holofote apontado para ele, criando uma sensacao premium e imersiva.
