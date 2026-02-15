

# Mobile UI/UX -- Perfeito em Todas as Telas

## Diagnostico Atual

Apos analisar todas as paginas e componentes, identifiquei os seguintes problemas restantes no mobile:

### Problemas Gerais
1. **Header**: O botao hamburger aparece no mobile mesmo com a bottom nav -- redundante. No mobile o header poderia ser mais compacto
2. **Espacamento entre secoes**: `space-y-8` e muito no mobile, deveria ser `space-y-5 md:space-y-8`
3. **Bottom nav**: Falta feedback haptico visual (scale animation no tap)
4. **Sidebar mobile (Sheet)**: Abre sem titulo acessivel (SheetTitle ausente), pode causar warning

### Pagina: Sales (Vendas)
- Carrinho fica abaixo dos produtos no mobile -- o usuario tem que rolar muito para ver
- Total e botao "Finalizar Venda" ficam escondidos
- **Solucao**: No mobile, o carrinho vira um bottom sheet (drawer) com um floating bar mostrando total + botao. Os produtos ficam full-width
- Vendas de Hoje: padding `p-6` excessivo no mobile
- Metadata de venda (badges) quebram em multiplas linhas de forma desorganizada

### Pagina: Orders (Pedidos)
- Metadata bar (Comanda/Mesa/Cliente/Canal) com `grid-cols-2 md:grid-cols-4` OK, mas labels `uppercase tracking-wider` ocupam espaco demais
- Cards de pedidos abertos: texto de detalhes (hora, peso, custo, receita, margem) quebram mal no mobile
- Floating bar de carrinho na parte inferior OK mas pode conflitar com bottom nav

### Pagina: Production (Producao)
- Preview de producao com grid `grid-cols-3` de stats OK mas textos truncam
- Historico de producao: metadados (hora, peso, custo, receita, margem, operador) todos inline, quebram feio no mobile
- Botoes de editar/deletar: muito pequenos e dificeis de tocar

### Pagina: CashRegister (Caixas)
- Titulo usa `text-3xl` manual em vez de `.page-title` -- inconsistente
- Historico de fechamentos: filtros `Select` lado a lado muito apertados no mobile
- Cards de caixa aberto: padding e tamanho OK

### Pagina: CRM
- Toolbar de filtros + busca + sort: sort `Select w-44` nao cabe bem no mobile, empurra conteudo
- Status pills no toolbar: quebram em multiplas linhas
- **Solucao**: Sort vai para debaixo da busca no mobile

### Pagina: Team (Equipe)
- Cards OK com `sm:grid-cols-2 lg:grid-cols-3`
- Botao "Novo Funcionario" pode nao caber ao lado do titulo no mobile

### Pagina: Profile
- Bem estruturado, `max-w-2xl mx-auto` OK
- Botao salvar poderia ser `w-full` no mobile

### Pagina: Recipes (Produtos)
- KPIs em `grid-cols-3` com textos muito pequenos
- Cards de produto OK

### Pagina: Cardapio (Cliente)
- Categories bar com padding `py-4` excessivo e titulo "Nossos Produtos" desnecessario no mobile -- ocupa espaco
- Header fixo OK mas busca e icones ficam apertados

### Pagina: Reports
- KPIs e graficos ja ajustados

### Pagina: Inventory
- Tabs ja com scroll horizontal, OK

## Mudancas Propostas

### 1. Layout Global -- Espacamento Responsivo
- Todas as paginas: `space-y-8` para `space-y-5 md:space-y-8`
- `AppLayout` main: `p-3 md:p-8` (ja esta) -- manter `pb-20 md:pb-8`

### 2. Bottom Nav -- Melhorias Visuais
- Adicionar `active:scale-95` no tap de cada botao
- Label ativo em bold com cor accent
- Indicador superior (bolinha ou linha) no item ativo

### 3. Header Mobile -- Mais Compacto
- No mobile, esconder o botao hamburger do header (a sidebar se abre pelo "Mais" da bottom nav)
- Manter apenas: nome + alertas bell + avatar
- Reduzir padding vertical no mobile

### 4. Sales -- Floating Cart Bar no Mobile
- No mobile, o carrinho vira um **floating bottom bar** fixo acima da bottom nav
- Mostra: quantidade de itens + total + botao "Ver Carrinho"
- Ao clicar, abre um **Sheet (drawer)** de baixo com todos os itens, pagamento e botao finalizar
- Produtos ficam na tela principal com scroll completo
- Vendas de Hoje: `p-4 md:p-6`

### 5. Orders -- Ajustes de Metadata
- Labels de metadata: remover `uppercase tracking-wider` no mobile, usar apenas `text-[10px]`
- Floating bar: ajustar `bottom` para ficar acima da bottom nav (`bottom-20`)

### 6. Production -- Historico Compacto
- Metadados de cada producao: empilhar em 2 linhas no mobile em vez de inline
- Botoes editar/deletar: `h-8 w-8` no mobile (tamanho de toque minimo)

### 7. CashRegister -- Consistencia
- Trocar `text-3xl font-bold` para `.page-title`
- Filtros do historico: empilhar verticalmente no mobile

### 8. CRM -- Toolbar Responsiva
- Sort `Select`: `w-full` no mobile, abaixo da busca
- Status pills: scroll horizontal com `no-scrollbar`

### 9. Cardapio (Cliente) -- Categories Compactas
- Remover titulo "Nossos Produtos" no mobile (manter no desktop)
- Reduzir padding da section de categorias: `py-2 md:py-4`

### 10. Profile -- Botao Full Width Mobile
- Botao salvar: `w-full md:w-auto`

## Detalhes Tecnicos

### Arquivos a modificar

1. **`src/components/layout/MobileBottomNav.tsx`**
   - Adicionar `active:scale-95 transition-transform` nos botoes
   - Adicionar indicador visual (dot ou line) no item ativo

2. **`src/components/layout/AppHeader.tsx`**
   - No mobile: esconder botao hamburger (navegacao esta na bottom nav)
   - Reduzir `py-3` para `py-2` no mobile

3. **`src/pages/Sales.tsx`**
   - Detectar `isMobile` com `useIsMobile()`
   - No mobile: renderizar floating cart bar + Sheet para carrinho
   - No desktop: manter layout atual (grid 5 cols)
   - Vendas de Hoje: `p-4 md:p-6`

4. **`src/pages/Orders.tsx`**
   - Floating bar bottom: `bottom-20 md:bottom-6`
   - Labels metadata: responsivos

5. **`src/pages/Production.tsx`**
   - Historico: layout de metadados em grid no mobile
   - Botoes acao: tamanho minimo de toque

6. **`src/pages/CashRegister.tsx`**
   - Titulo: usar `.page-title`
   - Filtros historico: `flex-col sm:flex-row`

7. **`src/pages/Crm.tsx`**
   - Search + sort: layout empilhado no mobile
   - Status pills: `overflow-x-auto no-scrollbar`

8. **`src/pages/Cardapio.tsx`**
   - Categories section: titulo condicional, padding reduzido
   - Melhorar spacing

9. **`src/pages/Profile.tsx`**
   - Botao: `w-full md:w-auto`

10. **`src/pages/Index.tsx`** -- `space-y-5 md:space-y-8`
11. **`src/pages/Recipes.tsx`** -- `space-y-4 md:space-y-6`
12. **`src/pages/Reports.tsx`** -- `space-y-5 md:space-y-8`
13. **`src/pages/Inventory.tsx`** -- `space-y-5 md:space-y-8`
14. **`src/pages/Team.tsx`** -- `space-y-5 md:space-y-8`

### Detalhe: Floating Cart Bar (Sales Mobile)

```text
+--------------------------------------------------+
| Pagina de Vendas (mobile)                        |
|                                                   |
| [Produtos em grid 2 cols, scroll livre]           |
|                                                   |
| [Vendas de Hoje - lista compacta]                 |
|                                                   |
+--------------------------------------------------+
| [3 itens] R$ 45,00  [Ver Carrinho >]   <- fixed  |
+--------------------------------------------------+
| [Dashboard] [Pedidos] [Vendas] [Estoque] [Mais]  |  <- bottom nav
+--------------------------------------------------+
```

Ao clicar "Ver Carrinho", abre Sheet de baixo com:
- Lista de itens do carrinho (editar qty, remover)
- Anotacoes (comanda, mesa, cliente)
- Canal + Pagamento
- Total grande + Botao Finalizar

