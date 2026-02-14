

# Ultra-Cinematografico — Toda a Plataforma

Transformacao radical do design system e todas as paginas para um nivel de sofisticacao visual dramaticamente superior. Cada elemento sera repensado com profundidade, luz, sombra e movimento.

---

## 1. Design System — Fundacao Cinematografica (index.css + tailwind.config.ts)

### Novas classes CSS
- `.glass-card` — glassmorphism com backdrop-blur-xl, borda com gradiente sutil, sombra em camadas (shadow inset + shadow externa)
- `.shine-effect` — pseudo-elemento com brilho diagonal animado que percorre o card no hover
- `.depth-shadow` — sistema de sombra em 3 camadas (sombra curta + media + longa) para profundidade real
- `.hero-gradient` — gradiente radial dramatico para headers de secao
- `.floating-glow` — halo de luz atras de elementos de destaque
- `.border-shine` — borda com gradiente animado (ouro para transparente)

### Novas animacoes
- `float` — movimento sutil de flutuacao vertical (2px up/down, 4s loop)
- `shine-sweep` — brilho diagonal varrendo da esquerda para direita
- `gradient-shift` — movimento lento do gradiente de fundo
- `count-up` — para numeros aparecendo com efeito de contagem

### Aprimoramentos tipograficos
- Titulos de pagina: `text-4xl font-extrabold tracking-tighter` com gradiente de texto
- Subtitulos com `letter-spacing: 0.08em` e peso mais leve
- Numeros financeiros com tamanho maior e contraste mais forte

---

## 2. Sidebar — Depth & Glow (AppSidebar.tsx)

- Fundo com gradiente mais dramatico: 3 stops (escuro, mais escuro, quase preto)
- Linha vertical luminosa dourada na borda direita da sidebar (1px com glow)
- Logo com animacao `float` sutil
- Item ativo: fundo com gradiente horizontal (dourado transparente -> transparente), barra lateral com glow
- Hover nos itens: icone ganha cor dourada com transicao + leve glow
- Separadores entre grupos com linha gradiente (dourado -> transparente)
- Avatar no rodape com ring dourado pulsante

---

## 3. Header — Glass Authority (AppHeader.tsx)

- Background com `backdrop-blur-2xl` e borda inferior com gradiente sutil
- Saudacao com texto em gradiente dourado (nao todo, so o nome)
- Badge de alertas com glow pulsante vermelho atras
- Badge "Tudo certo" com glow verde sutil
- Relogio com fonte mono e opacidade reduzida
- Avatar com ring animado no hover

---

## 4. Dashboard — Cinematic Command Center (Index.tsx)

### KPI Cards
- Card de Faturamento: fundo com gradiente radial escuro, brilho dourado na borda superior, numero com `text-4xl` e glow sutil
- Outros cards: glassmorphism com `backdrop-blur`, borda com `border-shine`, icone flutuando com `float`
- Cada card com `shine-effect` no hover (brilho diagonal passando)
- Valores com animacao de contagem ao aparecer

### Grafico de Desempenho
- Fundo com gradiente radial escuro profundo (nao plano)
- Area do grafico com glow dourado mais intenso
- Dots do grafico com pulse ring animado no hover
- Barra de resumo inferior com glassmorphism interno
- Grid com opacidade minima, quase invisivel

### Painel de Alertas
- Fundo com glassmorphism forte
- Timeline com linha vertical em gradiente (dourado no topo -> transparente embaixo)
- Dots da timeline com glow pulsante por severidade
- Hover nos itens com elevacao e brilho lateral

### Acesso Rapido
- Cards com icone central grande (48px) com fundo em gradiente circular
- Hover: card inteiro ganha glow sutil da cor do icone + elevacao 8px + escala 1.03
- Texto com transicao de cor no hover

---

## 5. Login — Cinematic Entrance (Auth.tsx)

- Painel esquerdo: gradiente com 4 stops e movimento lento (`gradient-shift`)
- Formas flutuantes com blur e opacidade variavel, tamanhos maiores
- Logo com glow dourado pulsante + animacao float
- Titulo com texto gradiente dourado
- Features com icones que fazem float individualmente
- Painel direito: card com glassmorphism forte, borda com `border-shine`
- Inputs com foco que gera glow dourado sutil
- Botao com gradiente mais complexo (3 cores) e `shine-effect` no hover

---

## 6. Vendas — Premium POS (Sales.tsx)

- Produtos: cards com hover que adiciona glow + escala + sombra dramatica
- Badge de fatias com fundo gradiente
- Carrinho: card com `gradient-border` mais intenso e glassmorphism
- Total: tamanho `text-4xl`, glow dourado, fonte mono
- Botao finalizar: gradiente 3 cores + shine-effect + sombra dramatica
- Historico: cada venda com hover glow e transicao suave

---

## 7. Estoque — Visual Depth (Inventory.tsx)

- Filter pills com transicao mais dramatica (escala + sombra ao ativar)
- Cards com glassmorphism e borda que muda de cor conforme status (verde/amarelo/vermelho)
- LifeBar com gradiente em vez de cor solida + glow que pulsa quando critico
- Numero de fatias com `text-3xl` e peso extra bold
- Card critico com borda vermelha pulsante e fundo avermelhado sutil

---

## 8. Producao — Receipt Elegance (Production.tsx)

- Card de nova producao com glassmorphism forte e borda shine
- Preview de producao: fundo com gradiente radial sutil, stats com glassmorphism individual
- Barra de fatias visuais com cores em gradiente (claro -> escuro)
- Timeline com glow nos dots e hover com elevacao
- Botao confirmar com shine-effect

---

## 9. Relatorios — Data Cinema (Reports.tsx)

- Tabs com underline animada dourada em vez de background
- KPI cards com `shine-effect` e icone com glow
- Graficos com tooltip glassmorphism e sombra dramatica
- Tabela producao vs venda: hover com glow lateral e borda left colorida
- Badge de perda com glow vermelho quando alta

---

## 10. Perfil — Hero Header (Profile.tsx)

- Header gradient com mais profundidade (4 stops) e particulas flutuantes sutis
- Avatar com ring dourado animado (rotacao lenta)
- Secoes do form com separadores em gradiente
- Inputs com focus glow dourado
- Botao salvar com shine-effect e transicao de estado animada

---

## 11. Equipe — Premium Cards (Team.tsx)

- Cards com glassmorphism e hover que adiciona glow + elevacao
- Avatar com ring colorido que pulsa sutilmente
- Dropdown de role com visual glassmorphism
- Indicador visual de role com gradiente de cor

---

## 12. Alertas — Dramatic Timeline (Alerts.tsx)

- Timeline com linha em gradiente vertical (cor -> transparente)
- Icones de severidade com glow pulsante forte
- Cards de alerta critico com borda vermelha + fundo avermelhado sutil + glow
- Botao resolver com gradiente verde e shine
- Dialog de resolucao com glassmorphism profundo

---

## 13. Receitas — Refined Cards (Recipes.tsx + RecipeCard.tsx)

- Cards com shine-effect no hover
- Gradiente de categoria mais intenso e com glow sutil
- Margem com barra visual (pequeno progress bar colorido)
- Stats com glassmorphism individual
- Botoes de acao com transicao mais suave

---

## Detalhes Tecnicos

### Arquivos a modificar (15 arquivos)
1. `src/index.css` — Novas classes cinematograficas, animacoes, efeitos
2. `tailwind.config.ts` — Keyframes (float, shine-sweep, gradient-shift)
3. `src/components/layout/AppSidebar.tsx` — Glow, gradientes, animacoes
4. `src/components/layout/AppHeader.tsx` — Glass authority, gradientes
5. `src/components/layout/AppLayout.tsx` — Background aprimorado
6. `src/pages/Index.tsx` — Dashboard cinematografico completo
7. `src/pages/Auth.tsx` — Login com entrance dramatica
8. `src/pages/Sales.tsx` — POS premium
9. `src/pages/Inventory.tsx` — Depth visual
10. `src/pages/Production.tsx` — Receipt elegance
11. `src/pages/Reports.tsx` — Data cinema
12. `src/pages/Profile.tsx` — Hero header
13. `src/pages/Team.tsx` — Premium cards
14. `src/pages/Alerts.tsx` — Dramatic timeline
15. `src/pages/Recipes.tsx` — Titulo aprimorado
16. `src/components/recipes/RecipeCard.tsx` — Shine effect cards

### Zero mudancas em logica de negocios
Toda logica, hooks, queries e banco de dados permanecem intactos. Apenas transformacao visual pura.

