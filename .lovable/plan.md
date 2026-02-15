
# Correcao: Sidebar Abrindo/Fechando ao Navegar pelo Mobile

## Diagnostico

O problema tem duas causas:

1. **Nao ha fechamento automatico da sidebar ao trocar de rota no mobile.** Se a sidebar estiver aberta (via "Mais") e o usuario clicar em um item da navbar inferior, a navegacao acontece mas a sidebar permanece aberta, causando conflito visual -- o Sheet (overlay escuro + painel lateral) continua em tela durante a transicao de pagina, criando o efeito de "abrir e fechar" rapido.

2. **Os botoes da navbar nao fecham a sidebar.** Os botoes de navegacao (Inicio, Pedidos, Vendas, Estoque) apenas chamam `navigate()` sem fechar a sidebar antes, o que gera sobreposicao visual durante a transicao.

## Solucao

### 1. `src/components/layout/AppLayout.tsx`

Adicionar um `useEffect` que fecha a sidebar automaticamente sempre que a rota muda no mobile. Isso garante que qualquer navegacao (seja pela navbar, header ou sidebar) feche o painel lateral de forma limpa.

```tsx
import { useLocation } from 'react-router-dom';

// Dentro do componente:
const location = useLocation();

useEffect(() => {
  if (isMobile) setSidebarOpen(false);
}, [location.pathname, isMobile]);
```

Remover o `useEffect` antigo que apenas reagia a `isMobile`, pois este novo cobre ambos os casos (mudanca de rota E mudanca de dispositivo).

### 2. `src/components/layout/MobileBottomNav.tsx`

Adicionar uma prop `onCloseSidebar` e chamar antes de navegar, garantindo que a sidebar feche ANTES da navegacao para evitar qualquer flash visual:

```tsx
interface MobileBottomNavProps {
  onOpenMore: () => void;
  onCloseSidebar: () => void;
}

// No onClick de cada item:
onClick={() => {
  onCloseSidebar();
  navigate(item.path);
}}
```

### 3. `src/components/layout/AppLayout.tsx` (passagem da prop)

Passar a nova prop para o componente:
```tsx
<MobileBottomNav
  onOpenMore={() => setSidebarOpen(true)}
  onCloseSidebar={() => setSidebarOpen(false)}
/>
```

## Resultado

- Navegar pela barra inferior fecha a sidebar instantaneamente (sem flash)
- Navegar pela propria sidebar tambem fecha automaticamente (pelo useEffect de rota)
- Transicoes limpas e fluidas entre paginas no mobile
