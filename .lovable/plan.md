

# Sidebar colapsavel + Layout mobile completo

## Situacao atual

O layout usa uma sidebar fixa de `w-64` (256px) com `ml-64` no conteudo. Nao ha botao para esconder/mostrar, e no mobile a sidebar fica cortada ou inacessivel. Todas as telas admin usam `AppLayout` que encapsula sidebar + header + conteudo.

## Mudancas propostas

### 1. Refatorar `AppLayout.tsx` para usar estado de sidebar colapsavel

- Adicionar estado `sidebarOpen` com `useState(true)` no desktop e `useState(false)` no mobile
- Usar o hook `useIsMobile()` existente para detectar tela pequena
- No mobile: sidebar vira um `Sheet` (drawer) que abre por cima com overlay
- No desktop: sidebar alterna entre `w-64` (aberta) e `w-0` (fechada) com transicao suave
- Conteudo principal ajusta `ml-64` / `ml-0` conforme estado

### 2. Refatorar `AppSidebar.tsx`

- Receber props `open` e `onClose` para controle externo
- No mobile: renderizar dentro de um `Sheet` com side="left"
- No desktop: manter posicao fixa mas com classe de transicao `translate-x` ou `w-0` quando fechado
- Ao clicar em um item de nav no mobile, fechar a sidebar automaticamente

### 3. Refatorar `AppHeader.tsx`

- Adicionar botao hamburger (`Menu` icon) no lado esquerdo que chama `toggleSidebar`
- No mobile: reorganizar o header para caber em telas pequenas
  - Saudacao em fonte menor ou oculta
  - Icones de acao compactados
  - Data/hora oculta no mobile
- Receber prop `onToggleSidebar`

### 4. Responsividade de todas as telas admin

Cada pagina que usa `AppLayout` ja herda o layout responsivo. Ajustes adicionais:

- `main` padding: `p-8` no desktop, `p-4` no mobile
- Grids de KPIs (Index): `grid-cols-4` desktop, `grid-cols-2` tablet, `grid-cols-1` mobile
- Tabelas: scroll horizontal no mobile
- Cards: full-width no mobile
- Formularios (RecipeForm, etc): campos empilhados no mobile

### 5. Tela do Cardapio (cliente)

O Cardapio ja e uma pagina standalone sem AppLayout. Verificar e ajustar:
- Grid de produtos: `grid-cols-1` no mobile
- Carrinho Sheet: ja responsivo por natureza
- Header do cardapio: compactar no mobile

## Detalhes tecnicos

### AppLayout.tsx (novo)

```text
+------------------------------------------------------+
| [hamburger] Header (com greeting, badges, avatar)    |
+------------------------------------------------------+
| Sidebar (Sheet no mobile | fixed no desktop)         |
| +--------------------------------------------------+ |
| | Content area (ml-64 desktop / ml-0 mobile)       | |
| +--------------------------------------------------+ |
+------------------------------------------------------+
```

- `useIsMobile()` determina o modo
- Estado `sidebarOpen`: `boolean`
- Desktop: sidebar fixa com `transition-all duration-300`, conteudo com `ml` dinamico
- Mobile: sidebar dentro de `<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side="left">...</SheetContent></Sheet>`

### AppSidebar.tsx

- Extrair o conteudo da sidebar para um componente `SidebarContent` reutilizavel
- `AppSidebar` recebe `open`, `onClose`, `isMobile`
- Se mobile: renderiza `Sheet` com `SidebarContent` dentro
- Se desktop: renderiza `aside` com classes de visibilidade condicionais

### AppHeader.tsx

- Adicionar `Menu` icon (lucide) como primeiro elemento
- No mobile: esconder saudacao longa, mostrar apenas nome curto
- Compactar badges e botoes em tamanho menor

### Responsividade das paginas

Ajustes em classes Tailwind existentes:
- `grid-cols-4` para `grid-cols-2 lg:grid-cols-4`
- `p-8` para `p-4 md:p-8`
- Tabelas com `overflow-x-auto`
- Cards com `w-full` no mobile

### Arquivos impactados

1. `src/components/layout/AppLayout.tsx` - refatoracao completa
2. `src/components/layout/AppSidebar.tsx` - refatoracao para aceitar props e modo mobile
3. `src/components/layout/AppHeader.tsx` - botao hamburger + responsividade
4. `src/pages/Index.tsx` - grids responsivos
5. `src/pages/Recipes.tsx` - grid responsivo
6. `src/pages/Sales.tsx` - layout responsivo
7. `src/pages/Orders.tsx` - layout responsivo
8. `src/pages/Production.tsx` - layout responsivo
9. `src/pages/Inventory.tsx` - layout responsivo
10. `src/pages/CashRegister.tsx` - layout responsivo
11. `src/pages/Reports.tsx` - layout responsivo
12. `src/pages/Team.tsx` - layout responsivo
13. `src/pages/Crm.tsx` - layout responsivo
14. `src/pages/Profile.tsx` - layout responsivo
15. `src/pages/Cardapio.tsx` - ajustes mobile no grid de produtos

