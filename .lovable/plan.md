

# Redesign do Cardapio Digital com Tema da Plataforma

## Objetivo

Transformar o cardapio digital de um visual generico branco/vermelho para o tema premium da plataforma -- tons quentes, dourados, tipografia Playfair Display nos titulos, DM Sans no corpo, e a estetica cinematica que ja existe no resto do sistema.

## Inspiracao da Referencia

Da imagem de referencia, extrair o layout estrutural:
- Header escuro com busca centralizada e icone do carrinho a direita
- Secao de categorias com titulo decorativo e linha separadora
- Cards de produto com imagens grandes, cantos arredondados e layout limpo
- Barra inferior do carrinho mais sofisticada

## Alteracoes Visuais

### Header
- Fundo escuro (`hsl(24 35% 15%)` -- cor do sidebar da plataforma) com gradiente sutil
- Titulo "Cardapio" com fonte Playfair Display em dourado (text-gradient-gold)
- Campo de busca com fundo semi-transparente e borda sutil
- Icone do carrinho a direita do header com badge de quantidade

### Categorias
- Titulo da secao com estilo "Nossos Produtos" usando Playfair Display
- Pills de categoria com estilo dourado quando ativas (gradiente gold) em vez de vermelho
- Fundo da secao com tom creme da plataforma

### Cards de Produto
- Usar a classe `glass-card` ou `card-cinematic` existente na plataforma
- Fundo com leve glassmorphism em vez de branco puro
- Preco em JetBrains Mono (font-mono-numbers)
- Botao de adicionar com cor accent (dourado) em vez de vermelho
- Hover com efeito de elevacao suave (card-cinematic)
- Imagens com aspect-ratio 4:3 em vez de quadrado para melhor visualizacao

### Barra do Carrinho (flutuante)
- Fundo escuro com glassmorphism (`bg-sidebar/95 backdrop-blur-xl`)
- Texto e icones em dourado/creme
- Botao "Fazer Pedido" com gradiente dourado

### Dialog de Checkout
- Estilo consistente com o tema: fundo creme, bordas suaves, botao dourado
- Totais em JetBrains Mono

### Tela de Sucesso
- Fundo com hero-gradient da plataforma
- Icone de sucesso em dourado
- Tipografia Playfair Display no titulo

### Fundo geral da pagina
- Usar `bg-background` (creme quente) em vez de branco puro
- Aplicar `hero-gradient` sutil no fundo

## Arquivo Alterado

- `src/pages/Cardapio.tsx` -- unica alteracao, reestilizando todos os elementos visuais

## Detalhes Tecnicos

- Remover o `style={{ fontFamily: ... }}` inline e usar as fontes definidas no CSS global (DM Sans para corpo, Playfair Display via classes de heading)
- Reutilizar classes utilitarias ja existentes: `glass-card`, `text-gradient-gold`, `font-mono-numbers`, `hero-gradient`, `depth-shadow`
- Manter toda a logica de carrinho, checkout e edge function intacta
- Substituir todas as cores hardcoded (red-600, gray-100) por variaveis do tema (primary, accent, muted, etc.)

