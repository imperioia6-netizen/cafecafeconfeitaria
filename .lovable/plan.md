
# Corrigir Bugs de Interface que Causam Tela Branca

## Raiz dos Problemas

Tela branca em React acontece quando um componente lança uma exceção durante o render ou quando uma Promise rejeitada não tratada corrompe o estado. Foram identificados os seguintes padrões de risco no projeto:

### 1. `Orders.tsx` — Acesso inseguro em `editingOrder`

Na linha 700, `editingOrder.id.slice(0, 4)` assume que `id` existe e é string. Se `editingOrder.id` for `undefined` em qualquer instante de transição de estado, o app quebra. Mesmo padrão ocorre nas linhas 387, 700 e 944.

Também na linha 675, `createPortal(…, document.body)` — se o componente renderizar durante SSR ou com `document` undefined (edge case em hot reload), quebra.

### 2. `Crm.tsx` — Early return antes de todos os hooks (padrão incorreto)

Nas linhas 36-37:
```
if (!loading && !user) { navigate('/auth'); return null; }
if (!loading && !isOwner) { navigate('/'); return null; }
```
Esses retornos condicionais acontecem **durante o render**, chamando `navigate()` dentro do corpo do componente (não em effect). Isso viola as regras de React e pode causar loops de render ou tela branca em certas navegações. O correto é usar `<Navigate />` ou um `useEffect`.

### 3. `CustomerDetailSheet.tsx` — `mutateAsync` sem try/catch

`handleDelete` usa `await deleteCustomer.mutateAsync(...)` diretamente sem try/catch. Se a mutation falhar, a Promise rejeitada sobe sem ser capturada, potencialmente causando crash.

### 4. `AppLayout.tsx` — `window.innerWidth` no estado inicial

```tsx
const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
```
Em contextos de hot-reload ou quando o componente monta antes do window estar totalmente disponível, isso pode lançar erro. Mais seguro: usar `typeof window !== 'undefined'` com fallback.

### 5. `Sales.tsx` — `handleSubmit` sem try/catch completo

O fluxo de criação de venda pode ter rejeições não capturadas em edge cases.

### 6. `useAuth.tsx` — `fetchRoles` sem try/catch

A função `fetchRoles` não tem tratamento de erro. Se o Supabase retornar erro (como o `refresh_token_not_found` que já aparece nos logs), pode gerar estado inconsistente.

## Plano de Correção

### Arquivo: `src/pages/Crm.tsx`
- Substituir os early returns imperativos com `navigate()` por retornos JSX com `<Navigate />` do react-router — forma correta de redirecionar durante render sem violar regras de hooks

### Arquivo: `src/pages/Orders.tsx`
- Adicionar optional chaining em todos os acessos a `editingOrder`: `editingOrder?.order_number`, `editingOrder?.id?.slice(0, 4) ?? '...'`
- Envolver `createPortal` em verificação `typeof document !== 'undefined'`
- Proteger a linha 700 e 944 com `editingOrder?.id?.slice(0, 4) ?? '???'`

### Arquivo: `src/components/crm/CustomerDetailSheet.tsx`
- Adicionar try/catch em `handleDelete` com toast.error de feedback

### Arquivo: `src/hooks/useAuth.tsx`
- Adicionar try/catch em `fetchRoles` para que erro de token expirado não cause crash

### Arquivo: `src/components/layout/AppLayout.tsx`
- Usar fallback seguro no `useState` inicial: `() => typeof window !== 'undefined' && window.innerWidth >= 768`

### Arquivo: `src/pages/Sales.tsx`
- Verificar e reforçar try/catch no handler de submit da venda

## Detalhes Técnicos

**Crm.tsx early return (problema crítico):**
```tsx
// ANTES (errado — chama navigate durante render)
if (!loading && !user) { navigate('/auth'); return null; }

// DEPOIS (correto)
if (!loading && !user) return <Navigate to="/auth" replace />;
if (!loading && !isOwner) return <Navigate to="/" replace />;
```

**Orders.tsx acesso seguro:**
```tsx
// ANTES
editingOrder.order_number || editingOrder.id.slice(0, 4)

// DEPOIS
editingOrder?.order_number || editingOrder?.id?.slice(0, 4) ?? '...'
```

**useAuth.tsx fetchRoles protegida:**
```tsx
const fetchRoles = async (userId: string) => {
  try {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (error) throw error;
    if (data) setRoles(data.map(r => r.role as AppRole));
  } catch {
    setRoles([]);
  }
};
```

**CustomerDetailSheet.tsx handleDelete com tratamento:**
```tsx
const handleDelete = async () => {
  try {
    await deleteCustomer.mutateAsync(customer.id);
    onOpenChange(false);
  } catch (e: any) {
    toast.error(e?.message || 'Erro ao excluir cliente');
  }
};
```
