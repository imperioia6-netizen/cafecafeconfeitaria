
# Redesign Mobile Completo -- App-Like Experience

## Visao Geral

Transformar toda a experiencia mobile em algo que parece um app nativo, com bottom navigation, cards compactos, espacamentos otimizados e hierarquia visual clara para todos os perfis (Admin, Atendente, Cliente).

## Problemas Identificados

1. **Sem bottom navigation** -- usuario depende do hamburger para navegar, nao e intuitivo
2. **Titulos muito grandes** no mobile (`text-4xl` para `.page-title`)
3. **KPI cards** ocupam muito espaco vertical empilhando 1 por linha
4. **Tabs e pills** nao cabem bem, quebram linha de forma desorganizada
5. **Padding excessivo** (`p-6`) em cards no mobile
6. **Graficos** nao se adaptam bem a tela pequena
7. **Formularios** (Production, Sales, Orders) tem inputs muito espacados
8. **CRM tabs** quebram em multiplas linhas sem scroll horizontal
9. **Profile page** nao e centralizado (`max-w-2xl` sem `mx-auto`)
10. **Cardapio (cliente)** -- header fixo funciona mas categories bar tem padding demais

## Mudancas Propostas

### 1. Bottom Navigation Bar (Mobile)

Criar componente `MobileBottomNav` que aparece apenas no mobile (`md:hidden`), fixo na parte inferior da tela. Mostra 4-5 icones principais baseados no role do usuario:

**Admin/Owner:**
- Dashboard (LayoutDashboard)
- Pedidos (ClipboardList)
- Vendas (ShoppingCart)
- Estoque (Package)
- Mais... (MoreHorizontal) -- abre sidebar

**Atendente (Employee):**
- Producao (Coffee)
- Pedidos (ClipboardList)
- Vendas (ShoppingCart)
- Estoque (Package)
- Mais... (MoreHorizontal)

A bottom nav tera:
- Background blur com borda superior sutil
- Icone ativo com cor accent e label
- Icone inativo com cor muted
- Safe area padding para dispositivos com notch
- Altura: 64px + safe area

### 2. Reducao do Page Title no Mobile

Alterar `.page-title` no CSS:
```css
.page-title {
  @apply text-2xl md:text-4xl font-extrabold tracking-tighter;
}
```

### 3. KPI Cards Mobile -- Grid 2x2

Forcar `grid-cols-2` no mobile em todos os lugares onde KPIs aparecem. Reduzir padding interno dos cards de `p-5` para `p-3` no mobile. Reduzir tamanho dos valores de `text-3xl` para `text-xl` no mobile.

### 4. Tabs Horizontais com Scroll

Todas as TabsList que usam `flex-wrap` serao trocadas para scroll horizontal com `overflow-x-auto no-scrollbar` no mobile:
- CRM tabs
- Production tabs  
- Inventory tabs
- Recipes margin tabs

### 5. Cards e Formularios Compactos

- Reduzir `p-6` para `p-4` em todos os card-cinematic no mobile
- Inputs manter `h-11` (ja esta bom)
- Grids de stats (Production preview) de `grid-cols-5` para `grid-cols-3` e `grid-cols-2` no mobile

### 6. Grafico do Dashboard

- Reduzir altura de `260px` para `180px` no mobile
- Summary row abaixo: `grid-cols-3` (ja esta)

### 7. Profile Page

- Adicionar `mx-auto` ao container `max-w-2xl`

### 8. AppLayout -- Padding Bottom para Bottom Nav

- Adicionar `pb-20 md:pb-0` no main quando estiver no mobile para a bottom nav nao cobrir conteudo

### 9. Cardapio (Cliente) -- Ajustes

- Grid de produtos: `grid-cols-2` no mobile (em vez de 1)
- Cards de produto menores com aspect ratio compacto
- Floating cart bar na parte inferior mais compacta

### 10. Sales Page -- Layout Mobile

- No mobile, o carrinho vira um floating bottom sheet (ja existe parcialmente)
- Produtos em `grid-cols-2` no mobile

### 11. Orders Page -- Metadata Bar

- Compactar o formulario de comanda/mesa/cliente para 2 colunas no mobile
- Cards de pedidos abertos em lista vertical com menos padding

### 12. CSS Utilities

Adicionar no `index.css`:
```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

E safe area padding utility.

## Detalhes Tecnicos

### Arquivos a criar:
1. `src/components/layout/MobileBottomNav.tsx` -- Bottom navigation

### Arquivos a modificar:
1. `src/components/layout/AppLayout.tsx` -- Incluir MobileBottomNav + pb mobile
2. `src/index.css` -- page-title responsivo + no-scrollbar + safe area
3. `src/pages/Index.tsx` -- KPI grid 2 cols mobile + chart height
4. `src/pages/Production.tsx` -- stats grid + tabs scroll
5. `src/pages/Sales.tsx` -- product grid 2 cols mobile
6. `src/pages/Orders.tsx` -- metadata grid + compact
7. `src/pages/Crm.tsx` -- tabs scroll horizontal
8. `src/pages/Inventory.tsx` -- tabs scroll
9. `src/pages/Recipes.tsx` -- tabs scroll + kpi grid
10. `src/pages/CashRegister.tsx` -- compact mobile
11. `src/pages/Profile.tsx` -- mx-auto
12. `src/pages/Cardapio.tsx` -- grid 2 cols + compact cards
13. `src/components/cashregister/DayKpis.tsx` -- compact values mobile
14. `src/components/crm/CrmDashboardKpis.tsx` -- compact mobile
15. `src/pages/Reports.tsx` -- compact mobile

### Componente MobileBottomNav

```text
+--------------------------------------------------+
| [icon]    [icon]    [icon]    [icon]    [icon]   |
| Dashboard Pedidos   Vendas   Estoque    Mais     |
+--------------------------------------------------+
```

- Usa `useLocation` para highlight ativo
- Usa `useAuth` para filtrar por role
- Posicao: `fixed bottom-0 left-0 right-0 z-50`
- Background: `bg-background/95 backdrop-blur-xl border-t`
- Padding bottom: `env(safe-area-inset-bottom)`

### Hierarquia de roles na bottom nav

- Owner: Dashboard, Pedidos, Vendas, Estoque, Mais
- Employee: Producao, Pedidos, Vendas, Estoque, Mais  
- "Mais" abre a sidebar sheet existente
