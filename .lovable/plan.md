

# Plano: Corrigir 9 erros de build TypeScript nas Edge Functions

Os erros foram introduzidos pelo rebase do Cursor. São todos erros de tipagem simples.

## Arquivo 1: `supabase/functions/evolution-webhook/index.ts` (7 erros)

| Linha | Erro | Correção |
|---|---|---|
| 517 | `r` implicitly `any` | Adicionar tipo `(r: any)` |
| 570 | `r` implicitly `any` | Adicionar tipo `(r: any)` |
| 901 | `.catch` não existe em `PromiseLike` | Trocar por `try { await ... } catch (_) {}` |
| 1016 | `history` tipo incompatível com `runAtendente` | Cast: `history as { role: "user" \| "assistant"; content: string }[]` |
| 1087 | `.catch` não existe em `PostgrestFilterBuilder` | Remover `.catch(...)`, usar try/catch ou ignorar |
| 1100 | `.catch` não existe em `PostgrestFilterBuilder` | Remover `.catch(...)`, usar try/catch ou ignorar |
| 1126 | `.catch` não existe em `PostgrestFilterBuilder` | Trocar por `try { await ... } catch (_) {}` |

## Arquivo 2: `supabase/functions/inventory-alert/index.ts` (1 erro)

| Linha | Erro | Correção |
|---|---|---|
| 117 | Cast direto falha (recipes é array vs objeto) | Usar `as unknown as { ... }` (double cast) |

## Arquivo 3: `supabase/functions/public-order/index.ts` (1 erro)

| Linha | Erro | Correção |
|---|---|---|
| 187 | `err` is `unknown` | Trocar `err.message` por `(err as Error).message` |

Nenhuma mudança de lógica -- apenas ajustes de tipagem para o build passar.

