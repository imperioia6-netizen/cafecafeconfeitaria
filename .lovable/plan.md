

# Redesign Premium da Tela de Login

## Visao Geral

A tela atual e funcional mas visualmente plana e generica. O redesign eleva a interface para nivel premium com as seguintes melhorias:

## Mudancas Visuais

### Painel Esquerdo (Branding)
- Remover animacoes infinitas (float, gradient-shift) que consomem GPU desnecessariamente
- Substituir por gradientes estaticos com mais profundidade e contraste
- Adicionar uma linha decorativa vertical dourada sutil entre os paineis
- Tipografia do titulo "Cafe Cafe" maior (text-6xl) com tracking mais apertado para mais impacto
- Subtitulo com letter-spacing expandido para elegancia
- Features list com layout mais refinado: linhas separadoras sutis entre items, tipografia maior
- Adicionar um selo discreto "Sistema de Gestao" ou badge de credibilidade no topo
- Remover o icone Coffee gigante flutuante — substituir por uma composicao tipografica pura (o nome como hero, sem icone generico)

### Painel Direito (Formulario)
- Fundo com micro-textura de ruido (CSS noise pattern ja existente no projeto: `nav-cinema-bg`)
- Card do formulario com borda sutil semi-transparente (glass-card pattern)
- Inputs com altura maior (h-12), border-radius mais generoso, e fundo `white/[0.03]` para mais sutileza
- Labels com uppercase, letter-spacing, e tamanho menor (text-xs) para look editorial
- Botao "Entrar" com gradiente mais vibrante, altura h-14, border-radius completo (rounded-full) para destaque
- Separador visual "ou" entre o botao e o link de cadastro
- Link "Nao tem conta?" com estilo mais visivel — underline on hover

### Mobile
- Painel unico com branding compacto no topo (logo + nome em linha)
- Formulario ocupa o restante da tela
- Botao com tamanho confortavel para toque (h-14, min 48px)

### Detalhes de Acabamento
- Transicao suave entre login/cadastro com fade (sem re-render brusco)
- Footer discreto com "Cafe Cafe © 2026" no bottom do painel direito
- Remover `animate-float` e `animate-scale-in` do painel esquerdo (performance)
- Manter `shine-effect` no botao (hover only, nao infinite)

## Arquivo Modificado

### `src/pages/Auth.tsx`
- Reescrever JSX completo mantendo toda a logica de estado e handlers
- Estrutura: dois paineis, esquerdo branding puro tipografico, direito formulario com glass card
- Remover todas as animacoes infinitas
- Adicionar classes utilitarias existentes: `glass-card`, `input-glow`, `text-gradient-gold`, `shine-effect`, `separator-gradient`

### Tom Emocional
Authority + Precision + Warmth — uma tela de login que transmite confianca e sofisticacao, nao um template generico de SaaS.

