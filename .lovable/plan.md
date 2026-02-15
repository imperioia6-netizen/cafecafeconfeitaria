
# Dark Mode: Cards Brancos com Texto Preto

## Problema

No modo escuro, os cards KPI e o grafico de desempenho usam fundo marrom escuro com texto claro. O usuario quer que no dark mode os cards fiquem com fundo **branco** e texto **preto**, incluindo os graficos -- criando um contraste mais limpo e moderno.

## O que muda

### 1. Variaveis CSS do Dark Mode (`src/index.css`)

Alterar as variaveis do `.dark` para que `--card` e `--card-foreground` usem tons claros:

- `--card`: mudar de `24 20% 12%` (marrom escuro) para `0 0% 98%` (branco)
- `--card-foreground`: mudar de `36 30% 92%` (bege claro) para `24 30% 12%` (preto/escuro)
- `--popover` e `--popover-foreground`: mesmos ajustes para consistencia

O background geral (pagina) continua escuro, criando contraste.

### 2. KPI Card -- Primeiro Card com fundo especial (`src/pages/Index.tsx`)

O primeiro KpiCard (Faturamento) tem inline styles com cores fixas marrons. Adicionar logica `dark:` para usar fundo branco:

- Remover o inline style de `background` fixo e usar classes condicionais
- No dark mode: fundo branco, texto preto
- No light mode: manter o gradiente marrom atual

### 3. Grafico de Desempenho (`src/pages/Index.tsx`)

O card do grafico tambem tem inline styles com gradiente marrom. Ajustar:

- No dark mode: fundo branco, texto preto
- Cores do grafico (eixos, grid, tooltip) adaptadas para fundo branco no dark
- Summary row (Vendas Hoje, Faturamento, Ticket Medio): fundo com opacidade escura no dark

### 4. Glass Effects no Dark (`src/index.css`)

Ajustar `.glass-card` e `.card-cinematic` para que no dark mode usem fundo branco em vez do glass escuro:

- Adicionar override `.dark .glass-card` com `background: hsl(0 0% 98%)` e `color: hsl(24 30% 12%)`

## Detalhes Tecnicos

### CSS (`src/index.css`)

```css
.dark {
  --card: 0 0% 98%;
  --card-foreground: 24 30% 12%;
  --popover: 0 0% 98%;
  --popover-foreground: 24 30% 12%;
}
```

Adicionar regra para `.dark .glass-card` e `.dark .card-cinematic`:
```css
.dark .glass-card,
.dark .card-cinematic {
  background: hsl(0 0% 98% / 0.95);
  color: hsl(24 30% 12%);
  border-color: hsl(0 0% 85%);
}
```

### Index.tsx -- KpiCard

Detectar dark mode via `document.documentElement.classList.contains('dark')` ou via CSS classes. Para o primeiro card (isFirst), no dark mode usar fundo branco em vez do gradiente marrom. Alternativa mais limpa: usar classes Tailwind `dark:bg-white dark:text-gray-900` condicionalmente no className.

### Index.tsx -- Chart Card

Substituir os inline styles fixos por classes condicionais:
- Light: manter gradiente marrom atual
- Dark: `bg-white text-gray-900`
- Cores dos eixos do grafico: usar variavel CSS para adaptar (escuro no dark, claro no light)
- Summary boxes: `dark:bg-gray-100` ao inves de `hsl(36 40% 95% / 0.06)`

## Resumo de Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/index.css` | Variaveis dark card/popover brancas + override glass-card |
| `src/pages/Index.tsx` | KpiCard e chart com classes dark-aware ao inves de inline styles fixos |

2 arquivos.
