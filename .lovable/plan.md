

# Diagnóstico das alterações feitas pelo Claude Code

## Erro de Build (e Runtime)

**Arquivo:** `supabase/functions/_shared/agentLogic.ts`, linha 404

**Problema:** Foi adicionado `.catch(() => ({ data: [] }))` na query da view `delivery_zones_disponibilidade`. O query builder do Supabase (PostgREST) **não é uma Promise nativa** — ele não tem método `.catch()`. Isso causa:

1. **Erro de build (TypeScript):** `Property 'catch' does not exist on type 'PostgrestFilterBuilder'`
2. **Erro de runtime (logs):** `supabase.from(...).select(...).order(...).catch is not a function` — este erro está quebrando o agente do WhatsApp inteiro (aparece dezenas de vezes nos logs)

## O que foi adicionado

A query na linha 404 busca dados de `delivery_zones_disponibilidade` (uma view que mostra bairros, taxas, vagas restantes para delivery). A intenção do `.catch()` era evitar falha caso a view não exista, mas a sintaxe está errada.

Também foram adicionadas (linhas 441-460) a montagem de texto das zonas de delivery para injetar no prompt do atendente — isso está correto, só a query que está com erro.

## Correção

**Linha 404** — Substituir a query com `.catch()` por uma chamada wrapped em `Promise.resolve().then()` para ter um `.catch()` válido:

```typescript
// De:
supabase.from("delivery_zones_disponibilidade").select("...").order("bairro").catch(() => ({ data: [] })),

// Para:
supabase.from("delivery_zones_disponibilidade").select("bairro, cidade, taxa, taxa_max, distancia_km, max_pedidos_dia, pedidos_hoje, vagas_restantes, disponivel").order("bairro").then(res => res, () => ({ data: [] })),
```

Alternativa mais limpa — usar `await` separado com try/catch em vez de colocar dentro do `Promise.all`. Mas a correção mínima é trocar `.catch()` por `.then(res => res, () => ({ data: [] }))` que funciona no PostgREST builder (o `.then()` **é** suportado).

## Impacto

Esta é a causa do agente WhatsApp não responder — **todo** request ao atendente falha nessa linha e cai no catch genérico retornando a mensagem de fallback, mas o erro ocorre antes do envio da resposta, quebrando o fluxo.

### Arquivo alterado
- `supabase/functions/_shared/agentLogic.ts`: corrigir linha 404

