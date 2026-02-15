

# Reorganizacao Mobile + Sidebar Original + Toggle Claro/Escuro

## Problemas Identificados

1. **Tabs cortadas no mobile** -- As abas (Producao, CRM, Estoque, etc.) transbordam a tela e ficam mal enquadradas, com texto e icones cortados nas bordas
2. **Sidebar "Mais" (grid)** -- Os quadros do menu grid nao preenchem a tela de forma equilibrada
3. **Painel do carrinho (Cardapio)** -- Elementos desalinhados no mobile
4. **Falta toggle claro/escuro** no header

## Solucao

### 1. Tabs Responsivas no Mobile (global)

Todas as paginas que usam tabs customizadas (Production, CRM, SmartHub, Inventory) serao ajustadas para o mobile:

- No mobile, as tabs mudam para **scroll horizontal com snap** dentro de um container com padding lateral
- Tamanho reduzido: `px-3 py-1.5 text-xs` no mobile, mantendo `px-5 py-2 text-sm` no desktop
- Icones menores no mobile (`h-3 w-3`)
- Container com `overflow-x-auto no-scrollbar` e `scroll-snap-type: x mandatory`

**Arquivos afetados:**
- `src/pages/Production.tsx` -- tabs Producao/Promocoes/Relatorios
- `src/pages/Crm.tsx` -- tabs Clientes/Pipeline/Aniversarios/Reativacao/Config
- `src/pages/Inventory.tsx` -- tabs Estoque/Vitrine/Alertas
- `src/pages/SmartHub.tsx` -- tabs Promocoes/Relatorios

### 2. Sidebar Revertida ao Estilo Original

Reverter o `AppSidebar.tsx` para usar a versao **lista vertical** tanto no desktop quanto no mobile (Sheet), removendo o grid de icones que foi adicionado recentemente. O mobile usara o mesmo `DesktopSidebarContent` dentro do Sheet, com ajustes de padding.

**Arquivo:** `src/components/layout/AppSidebar.tsx`

### 3. Toggle Claro/Escuro no Header

Adicionar um botao toggle (icone Sol/Lua) ao lado esquerdo do sino de notificacoes no `AppHeader.tsx`. O toggle alternara a classe `dark` no elemento `<html>`, persistindo a preferencia no `localStorage`.

**Arquivo:** `src/components/layout/AppHeader.tsx`

### 4. Cardapio -- Melhor Enquadramento Mobile

Ajustar o painel do carrinho (Sheet) e o header do cardapio para melhor alinhamento no mobile:
- Padding interno consistente
- Botoes e inputs com tamanho adequado ao toque

**Arquivo:** `src/pages/Cardapio.tsx`

## Detalhes Tecnicos

### Tabs Responsivas -- Padrao CSS

Adicionar ao `src/index.css` uma classe utilitaria para tabs mobile:

```css
@media (max-width: 767px) {
  .mobile-tabs {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .mobile-tabs > * {
    scroll-snap-align: start;
    flex-shrink: 0;
  }
}
```

Cada pagina aplicara classes responsivas nas TabsTrigger: `px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm` e nos icones `h-3 w-3 md:h-3.5 md:w-3.5`.

### Toggle Claro/Escuro

```tsx
// No AppHeader.tsx
const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

const toggleTheme = () => {
  const next = !dark;
  setDark(next);
  document.documentElement.classList.toggle('dark', next);
  localStorage.setItem('theme', next ? 'dark' : 'light');
};
```

Icone: `Sun` quando escuro (clica para clarear), `Moon` quando claro (clica para escurecer). Posicionado imediatamente antes do sino de notificacoes.

### Sidebar Revertida

Remover o componente `MobileSidebarContent` com grid e reutilizar `DesktopSidebarContent` para ambos os casos (desktop e mobile Sheet), simplificando o codigo.

## Resumo de Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/index.css` | Classe utilitaria mobile-tabs |
| `src/components/layout/AppHeader.tsx` | Toggle claro/escuro + icone Sun/Moon |
| `src/components/layout/AppSidebar.tsx` | Reverter para lista vertical no mobile |
| `src/pages/Production.tsx` | Tabs responsivas |
| `src/pages/Crm.tsx` | Tabs responsivas |
| `src/pages/Inventory.tsx` | Tabs responsivas |
| `src/pages/SmartHub.tsx` | Tabs responsivas |
| `src/pages/Cardapio.tsx` | Ajustes de padding/alinhamento mobile |

8 arquivos, mudancas focadas em responsividade e UX mobile.

