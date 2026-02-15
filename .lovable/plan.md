
# Corrigir Race Condition no Carregamento de Roles

## Problema Raiz

O `useAuth` marca `loading = false` **antes** de `fetchRoles` terminar. Isso causa:
1. Ao acessar `/`, o Dashboard ve `roles = []`, mostra spinner, mas em seguida o redirect podia disparar antes dos roles carregarem
2. O navegador ficou em `/production` de um redirect anterior -- recarregar nessa URL carrega Producao diretamente, sem passar pelo Dashboard

## Solucao

### 1. Corrigir `src/hooks/useAuth.tsx` -- Aguardar roles antes de `setLoading(false)`

Alterar o fluxo para que `setLoading(false)` so execute **depois** de `fetchRoles` completar:

```tsx
// getSession
supabase.auth.getSession().then(async ({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  if (session?.user) {
    await fetchRoles(session.user.id);
  }
  setLoading(false);
});

// onAuthStateChange
async (_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  if (session?.user) {
    await fetchRoles(session.user.id);
  } else {
    setRoles([]);
  }
  setLoading(false);
}
```

Remover o `setTimeout` no `onAuthStateChange` que atrasava o fetch desnecessariamente.

### 2. Usar `loading` no `src/pages/Index.tsx` em vez de `roles.length`

Substituir a verificacao de `roles.length === 0` por `loading`:

```tsx
const { isOwner, roles, loading } = useAuth();

if (loading) {
  return (
    <AppLayout>
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );
}

if (!isOwner) return <Navigate to="/production" replace />;
```

Isso e mais robusto porque `loading` so sera `false` quando os roles ja estiverem carregados.

## Resultado

- Recarregar em `/` sempre mostra o Dashboard para o admin
- O redirect para `/production` so acontece quando confirmado que o usuario NAO e owner
- Sem race conditions entre loading e roles
