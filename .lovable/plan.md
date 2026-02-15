

# Corrigir Carregamento Infinito no Dashboard

## Problema Raiz

A documentacao do Supabase recomenda NAO fazer chamadas a APIs Supabase diretamente dentro do callback `onAuthStateChange`. Ao colocar `await fetchRoles()` dentro desse callback, criamos um conflito que impede o `setLoading(false)` de funcionar corretamente.

## Solucao

### Arquivo: `src/hooks/useAuth.tsx`

Desacoplar a logica de loading:

1. **`onAuthStateChange`**: NAO aguardar `fetchRoles` — apenas disparar sem await (fire-and-forget). Este callback serve para reagir a mudancas de auth (login, logout, token refresh), nao para controlar o loading inicial.

2. **`getSession`**: Este continua sendo o unico responsavel pelo loading inicial. Ele aguarda `fetchRoles` e so entao chama `setLoading(false)`.

```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fire-and-forget — nao bloquear o callback
        fetchRoles(session.user.id);
      } else {
        setRoles([]);
      }
    }
  );

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      await fetchRoles(session.user.id);
    }
    setLoading(false);  // Unico ponto que controla loading inicial
  });

  return () => subscription.unsubscribe();
}, []);
```

### Motivo

- `onAuthStateChange` dispara o evento INITIAL_SESSION sincronamente ao registrar o listener
- Fazer `await` de chamadas Supabase dentro dele pode causar deadlock ou race condition
- Separar as responsabilidades: `getSession` controla o loading, `onAuthStateChange` reage a mudancas futuras

## Resultado

- O loading spinner desaparece assim que `getSession` + `fetchRoles` completam
- O Dashboard carrega normalmente para o admin
- Sem carregamento infinito

