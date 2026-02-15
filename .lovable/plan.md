
# Redirecionamento por Perfil apos Login

## Objetivo

Ao fazer login, cada perfil sera redirecionado automaticamente para sua pagina principal:
- **Owner (Administrador)**: Dashboard (`/`)
- **Employee (Atendente)**: Pedidos (`/orders`)
- **Client (Usuario)**: Cardapio (`/cardapio`)

## Alteracoes

### 1. `src/pages/Auth.tsx`

Atualmente, a linha `if (user) return <Navigate to="/" replace />` redireciona todos os usuarios para `/` (dashboard). Substituir por uma logica que consulta os roles do contexto de autenticacao:

```tsx
const { user, loading, signIn, signUp, roles } = useAuth();

// Determinar rota baseada no perfil
const getRedirectPath = () => {
  if (roles.includes('owner')) return '/';
  if (roles.includes('employee')) return '/orders';
  return '/cardapio';
};

if (user && roles.length > 0) return <Navigate to={getRedirectPath()} replace />;
```

A condicao `roles.length > 0` garante que o redirect so acontece DEPOIS que os roles foram carregados do banco, evitando redirecionar para a rota errada.

### 2. `src/components/layout/AppLayout.tsx`

Adicionar redirecionamento para funcionarios que tentam acessar o dashboard (rota `/`), enviando-os para `/orders`:

```tsx
if (viewAs === 'client') return <Navigate to="/cardapio" replace />;

// Novo: funcionarios que acessam "/" vao para /orders
const isEmployee = roles.includes('employee') && !roles.includes('owner');
if (isEmployee && location.pathname === '/') return <Navigate to="/orders" replace />;
```

Importar `roles` do `useAuth()`.

### 3. `src/hooks/useAuth.tsx`

Nenhuma alteracao necessaria -- o hook ja expoe `roles` no contexto.

## Resultado

- Admin loga e ve o Dashboard
- Atendente loga e ve a tela de Pedidos
- Cliente loga e ve o Cardapio
- Se um atendente tentar acessar `/` manualmente, sera redirecionado para `/orders`
