

# Corrigir Redirecionamento ao Recarregar o Dashboard

## Problema

Ao recarregar a pagina do Dashboard (`/`), o array `roles` comeca vazio enquanto carrega do banco. Nesse momento, `isOwner` e `false`, e a linha `if (!isOwner) return <Navigate to="/production" />` redireciona para Producao antes dos roles carregarem.

## Solucao

### Arquivo: `src/pages/Index.tsx`

Adicionar verificacao de `roles.length === 0` antes do redirect. Se os roles ainda nao carregaram, exibir o loading spinner em vez de redirecionar:

```tsx
const { isOwner, roles } = useAuth();

// Aguardar roles carregarem antes de decidir o redirect
if (roles.length === 0) {
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

Isso garante que o redirect so acontece DEPOIS que os roles foram carregados, evitando o falso negativo.
